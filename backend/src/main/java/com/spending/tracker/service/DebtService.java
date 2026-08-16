package com.spending.tracker.service;

import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.Debt;
import com.spending.tracker.entity.DebtTransaction;
import com.spending.tracker.entity.FriendBalance;
import com.spending.tracker.repository.DebtTransactionRepository;
import com.spending.tracker.repository.FriendBalanceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class DebtService {

    private final FriendBalanceRepository friendBalanceRepository;
    private final DebtTransactionRepository debtTransactionRepository;

    public DebtService(FriendBalanceRepository friendBalanceRepository, DebtTransactionRepository debtTransactionRepository) {
        this.friendBalanceRepository = friendBalanceRepository;
        this.debtTransactionRepository = debtTransactionRepository;
    }

    /**
     * Updates permanent friend net balances after a group bill is saved.
     * For each debtor, they owe the payer.
     *
     * @param bill         The group bill record.
     * @param parsedDebts  List of parsed individual shares.
     */
    @Transactional
    public void updateBalancesAfterBill(Bill bill, List<Debt> parsedDebts) {
        Long payerId = bill.getPayerId();

        for (Debt debt : parsedDebts) {
            Long debtorId = debt.getDebtorId();

            // Payer does not owe themselves
            if (debtorId.equals(payerId)) {
                continue;
            }

            BigDecimal amount = debt.getAmount();

            // Enforce userId1 < userId2 convention
            Long u1 = Math.min(payerId, debtorId);
            Long u2 = Math.max(payerId, debtorId);

            // Fetch record with pessimistic lock to prevent concurrent update anomalies
            FriendBalance friendBalance = friendBalanceRepository.findByUsersForUpdate(u1, u2)
                    .orElseGet(() -> {
                        FriendBalance fb = new FriendBalance(u1, u2);
                        return friendBalanceRepository.save(fb);
                    });

            if (payerId.equals(u1)) {
                // Payer is User 1, Debtor is User 2. User 2 owes User 1 -> netBalance increases.
                friendBalance.setNetBalance(friendBalance.getNetBalance().add(amount));
            } else {
                // Debtor is User 1, Payer is User 2. User 1 owes User 2 -> netBalance decreases.
                friendBalance.setNetBalance(friendBalance.getNetBalance().subtract(amount));
            }

            friendBalanceRepository.save(friendBalance);

            // Save individual split record as a bill split transaction
            DebtTransaction tx = new DebtTransaction(debtorId, payerId, amount, DebtTransaction.TransactionType.BILL_SPLIT);
            debtTransactionRepository.save(tx);
        }
    }

    /**
     * Settles the net debt balance between two users.
     * Resets the net balance back to zero and creates a virtual settlement transaction.
     *
     * @param user1Id First user ID.
     * @param user2Id Second user ID.
     */
    @Transactional
    public void settleUp(Long user1Id, Long user2Id) {
        if (user1Id.equals(user2Id)) {
            throw new IllegalArgumentException("Cannot settle debt with yourself");
        }

        Long u1 = Math.min(user1Id, user2Id);
        Long u2 = Math.max(user1Id, user2Id);

        // Fetch balance with pessimistic lock
        FriendBalance friendBalance = friendBalanceRepository.findByUsersForUpdate(u1, u2)
                .orElseThrow(() -> new EntityNotFoundException("No debt record found between user " + u1 + " and user " + u2));

        BigDecimal netBalance = friendBalance.getNetBalance();

        if (netBalance.compareTo(BigDecimal.ZERO) == 0) {
            return; // Already settled
        }

        Long senderId;
        Long receiverId;
        BigDecimal settlementAmount = netBalance.abs();

        if (netBalance.compareTo(BigDecimal.ZERO) > 0) {
            // netBalance > 0: User 2 owes User 1. User 2 pays User 1.
            senderId = u2;
            receiverId = u1;
        } else {
            // netBalance < 0: User 1 owes User 2. User 1 pays User 2.
            senderId = u1;
            receiverId = u2;
        }

        // 1. Create and save Settlement transaction record
        DebtTransaction settlementTx = new DebtTransaction(senderId, receiverId, settlementAmount, DebtTransaction.TransactionType.SETTLEMENT);
        debtTransactionRepository.save(settlementTx);

        // 2. Reset net balance to exactly zero
        friendBalance.setNetBalance(BigDecimal.ZERO);
        friendBalanceRepository.save(friendBalance);
    }
}
