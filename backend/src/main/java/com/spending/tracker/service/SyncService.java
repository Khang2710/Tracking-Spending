package com.spending.tracker.service;

import com.spending.tracker.dto.AppBootstrapData;
import com.spending.tracker.dto.SyncDataRequest;
import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.Budget;
import com.spending.tracker.entity.SavingsGoal;
import com.spending.tracker.entity.Transaction;
import com.spending.tracker.entity.User;
import com.spending.tracker.entity.Wallet;
import com.spending.tracker.repository.BillRepository;
import com.spending.tracker.repository.BudgetRepository;
import com.spending.tracker.repository.SavingsGoalRepository;
import com.spending.tracker.repository.TransactionRepository;
import com.spending.tracker.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SyncService {

    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final SavingsGoalRepository savingsGoalRepository;
    private final BillRepository billRepository;
    private final BudgetRepository budgetRepository;

    @Autowired
    public SyncService(
            WalletRepository walletRepository,
            TransactionRepository transactionRepository,
            SavingsGoalRepository savingsGoalRepository,
            BillRepository billRepository,
            BudgetRepository budgetRepository) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.savingsGoalRepository = savingsGoalRepository;
        this.billRepository = billRepository;
        this.budgetRepository = budgetRepository;
    }

    /**
     * Aggregates all initial data (Wallets, Transactions, Savings Goals, Current Month Budgets)
     * for the currently authenticated User into a single DTO.
     *
     * @param currentUser Currently authenticated User entity
     * @return AppBootstrapData object
     */
    public AppBootstrapData getBootstrapData(User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new IllegalArgumentException("Invalid user context for bootstrap data");
        }

        Long userId = currentUser.getId();

        // 1. Wallets
        List<Wallet> wallets = walletRepository.findByUserIdOrderByIdAsc(userId);

        // 2. Transactions
        List<Transaction> transactions = new ArrayList<>();
        for (Wallet w : wallets) {
            transactions.addAll(transactionRepository.findByWalletId(w.getId()));
        }

        // 3. Savings Goals
        List<SavingsGoal> savingsGoals = savingsGoalRepository.findByUserId(userId);

        // 4. Budgets for Current Month (YYYY-MM)
        String currentMonthStr = LocalDate.now().toString().substring(0, 7);
        List<Budget> budgets = budgetRepository.findByUserIdAndPeriodMonth(userId, currentMonthStr);

        return new AppBootstrapData(wallets, transactions, savingsGoals, budgets);
    }

    /**
     * Bulk syncs localStorage data (Wallets, Transactions, Savings Goals, Split Bills) to the PostgreSQL database.
     * Automatically assigns user ownership to the currently authenticated User.
     *
     * @param request     DTO containing lists of items to sync
     * @param currentUser Currently authenticated User entity
     * @return Map containing sync summary & record counts
     */
    @Transactional
    public Map<String, Object> syncBulkData(SyncDataRequest request, User currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new IllegalArgumentException("Invalid user context for bulk sync");
        }

        Map<String, Object> syncResult = new HashMap<>();

        // 1. Sync Wallets
        List<Wallet> wallets = request.getWallets();
        if (!wallets.isEmpty()) {
            for (Wallet w : wallets) {
                w.setUser(currentUser);
            }
            wallets = walletRepository.saveAll(wallets);
        }
        syncResult.put("walletsSynced", wallets.size());

        // Get primary/first wallet for fallback transaction linking
        Wallet defaultWallet = wallets.isEmpty() 
            ? walletRepository.findByUserId(currentUser.getId()).stream().findFirst().orElseGet(() -> {
                Wallet newW = new Wallet("Ví chính", 0.0, currentUser);
                return walletRepository.save(newW);
              })
            : wallets.get(0);

        // 2. Sync Transactions
        List<Transaction> transactions = request.getTransactions();
        if (!transactions.isEmpty()) {
            for (Transaction t : transactions) {
                if (t.getWallet() == null) {
                    t.setWallet(defaultWallet);
                }
            }
            transactions = transactionRepository.saveAll(transactions);
        }
        syncResult.put("transactionsSynced", transactions.size());

        // 3. Sync Savings Goals
        List<SavingsGoal> savingsGoals = request.getSavingsGoals();
        if (!savingsGoals.isEmpty()) {
            for (SavingsGoal sg : savingsGoals) {
                sg.setUserId(currentUser.getId());
            }
            savingsGoals = savingsGoalRepository.saveAll(savingsGoals);
        }
        syncResult.put("savingsGoalsSynced", savingsGoals.size());

        // 4. Sync Split Bills
        List<Bill> splitBills = request.getSplitBills();
        if (!splitBills.isEmpty()) {
            for (Bill b : splitBills) {
                b.setPayerId(currentUser.getId());
            }
            splitBills = billRepository.saveAll(splitBills);
        }
        syncResult.put("splitBillsSynced", splitBills.size());

        syncResult.put("message", "Bulk data synchronized successfully");
        syncResult.put("totalRecordsSynced", wallets.size() + transactions.size() + savingsGoals.size() + splitBills.size());

        return syncResult;
    }
}
