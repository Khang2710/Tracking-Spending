package com.spending.tracker.service;

import com.spending.tracker.dto.SyncDataRequest;
import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.SavingsGoal;
import com.spending.tracker.entity.Transaction;
import com.spending.tracker.entity.User;
import com.spending.tracker.entity.Wallet;
import com.spending.tracker.repository.BillRepository;
import com.spending.tracker.repository.SavingsGoalRepository;
import com.spending.tracker.repository.TransactionRepository;
import com.spending.tracker.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

import com.spending.tracker.dto.AppBootstrapData;
import com.spending.tracker.repository.BudgetRepository;
import com.spending.tracker.entity.Budget;

@ExtendWith(MockitoExtension.class)
class SyncServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private SavingsGoalRepository savingsGoalRepository;

    @Mock
    private BillRepository billRepository;

    @Mock
    private BudgetRepository budgetRepository;

    @InjectMocks
    private SyncService syncService;

    private User currentUser;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(10L);
        currentUser.setEmail("syncuser@example.com");
    }

    @Test
    @DisplayName("Should successfully sync bulk data and assign currentUser ownership")
    void syncBulkData_success() {
        Wallet wallet = new Wallet("Ví Tiết Kiệm", 500000.0, null);
        Transaction transaction = new Transaction(50000.0, "OUTCOME", "Ăn uống", null, null);
        SavingsGoal goal = new SavingsGoal();
        goal.setTitle("Mua Laptop");
        goal.setTargetAmount(BigDecimal.valueOf(20000000));
        goal.setCurrentAmount(BigDecimal.ZERO);
        Bill bill = new Bill();
        bill.setTotalAmount(BigDecimal.valueOf(150000));

        SyncDataRequest request = new SyncDataRequest(
                List.of(wallet),
                List.of(transaction),
                List.of(goal),
                List.of(bill)
        );

        when(walletRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(transactionRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(savingsGoalRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(billRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> result = syncService.syncBulkData(request, currentUser);

        assertNotNull(result);
        assertEquals("Bulk data synchronized successfully", result.get("message"));
        assertEquals(4, result.get("totalRecordsSynced"));

        assertEquals(currentUser, wallet.getUser());
        assertEquals(wallet, transaction.getWallet());
        assertEquals(10L, goal.getUserId());
        assertEquals(10L, bill.getPayerId());

        verify(walletRepository, times(1)).saveAll(anyList());
        verify(transactionRepository, times(1)).saveAll(anyList());
        verify(savingsGoalRepository, times(1)).saveAll(anyList());
        verify(billRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Should fetch all bootstrap data in single call")
    void getBootstrapData_success() {
        Wallet wallet = new Wallet("Ví Chính", 1000000.0, currentUser);
        wallet.setId(1L);
        Transaction tx = new Transaction(100000.0, "OUTCOME", "Food", java.time.LocalDateTime.now(), wallet);
        SavingsGoal goal = new SavingsGoal();
        Budget budget = new Budget(currentUser, "TOTAL", BigDecimal.valueOf(5000000), "2026-08");

        when(walletRepository.findByUserIdOrderByIdAsc(10L)).thenReturn(List.of(wallet));
        when(transactionRepository.findByWalletId(1L)).thenReturn(List.of(tx));
        when(savingsGoalRepository.findByUserId(10L)).thenReturn(List.of(goal));
        when(budgetRepository.findByUserIdAndPeriodMonth(eq(10L), anyString())).thenReturn(List.of(budget));

        AppBootstrapData bootstrapData = syncService.getBootstrapData(currentUser);

        assertNotNull(bootstrapData);
        assertEquals(1, bootstrapData.getWallets().size());
        assertEquals(1, bootstrapData.getTransactions().size());
        assertEquals(1, bootstrapData.getSavingsGoals().size());
        assertEquals(1, bootstrapData.getBudgets().size());
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when currentUser is null")
    void syncBulkData_nullUser_throwsException() {
        SyncDataRequest request = new SyncDataRequest();
        assertThrows(IllegalArgumentException.class, () -> syncService.syncBulkData(request, null));
    }
}
