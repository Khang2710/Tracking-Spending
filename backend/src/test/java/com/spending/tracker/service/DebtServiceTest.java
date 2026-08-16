package com.spending.tracker.service;

import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.Debt;
import com.spending.tracker.entity.DebtTransaction;
import com.spending.tracker.entity.FriendBalance;
import com.spending.tracker.repository.DebtTransactionRepository;
import com.spending.tracker.repository.FriendBalanceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock
    private FriendBalanceRepository friendBalanceRepository;

    @Mock
    private DebtTransactionRepository debtTransactionRepository;

    @InjectMocks
    private DebtService debtService;

    // =========================================================================
    // updateBalancesAfterBill tests
    // =========================================================================

    @Test
    @DisplayName("Payer's own debt is skipped (debtor == payer)")
    void updateBalancesAfterBill_payerSelfDebtSkipped() {
        Bill bill = createBill(1L, new BigDecimal("100.00"));
        List<Debt> debts = List.of(
                new Debt(1L, new BigDecimal("50.00")), // payer = debtor, should be skipped
                new Debt(2L, new BigDecimal("30.00"))  // different debtor, should be processed
        );

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.empty());
        when(friendBalanceRepository.save(any(FriendBalance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(debtTransactionRepository.save(any(DebtTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        debtService.updateBalancesAfterBill(bill, debts);

        // Only 1 debt transaction for debtor 2, not 2
        verify(debtTransactionRepository, times(1)).save(any(DebtTransaction.class));
    }

    @Test
    @DisplayName("New FriendBalance created when no existing record")
    void updateBalancesAfterBill_createsNewFriendBalance() {
        Bill bill = createBill(1L, new BigDecimal("100.00"));
        List<Debt> debts = List.of(new Debt(2L, new BigDecimal("40.00")));

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.empty());
        when(friendBalanceRepository.save(any(FriendBalance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.updateBalancesAfterBill(bill, debts);

        ArgumentCaptor<FriendBalance> captor = ArgumentCaptor.forClass(FriendBalance.class);
        verify(friendBalanceRepository, atLeastOnce()).save(captor.capture());

        // Find the final saved balance (after update)
        List<FriendBalance> allSaved = captor.getAllValues();
        FriendBalance finalBalance = allSaved.get(allSaved.size() - 1);

        // payer (1) < debtor (2), so payer = u1. netBalance should increase by 40.00
        assertEquals(new BigDecimal("40.00"), finalBalance.getNetBalance());
    }

    @Test
    @DisplayName("Existing balance increased when payer is user1")
    void updateBalancesAfterBill_payerIsUser1_balanceIncreased() {
        FriendBalance existing = new FriendBalance(1L, 2L);
        existing.setNetBalance(new BigDecimal("20.00"));

        Bill bill = createBill(1L, new BigDecimal("100.00"));
        List<Debt> debts = List.of(new Debt(2L, new BigDecimal("30.00")));

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.of(existing));
        when(friendBalanceRepository.save(any(FriendBalance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.updateBalancesAfterBill(bill, debts);

        // 20.00 + 30.00 = 50.00 (user2 owes user1 more)
        assertEquals(new BigDecimal("50.00"), existing.getNetBalance());
    }

    @Test
    @DisplayName("Existing balance decreased when debtor is user1 (debtor < payer)")
    void updateBalancesAfterBill_debtorIsUser1_balanceDecreased() {
        FriendBalance existing = new FriendBalance(2L, 5L);
        existing.setNetBalance(new BigDecimal("10.00"));

        // Payer is 5, Debtor is 2 -> u1=2, u2=5. Debtor(2) is u1.
        // Since debtor is u1, they owe payer(u2). Net balance decreases.
        Bill bill = createBill(5L, new BigDecimal("100.00"));
        List<Debt> debts = List.of(new Debt(2L, new BigDecimal("15.00")));

        when(friendBalanceRepository.findByUsersForUpdate(2L, 5L)).thenReturn(Optional.of(existing));
        when(friendBalanceRepository.save(any(FriendBalance.class))).thenAnswer(inv -> inv.getArgument(0));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.updateBalancesAfterBill(bill, debts);

        // 10.00 - 15.00 = -5.00 (user1=2 now owes user2=5)
        assertEquals(new BigDecimal("-5.00"), existing.getNetBalance());
    }

    @Test
    @DisplayName("BILL_SPLIT transaction recorded with correct sender and receiver")
    void updateBalancesAfterBill_recordsTransaction() {
        Bill bill = createBill(1L, new BigDecimal("60.00"));
        List<Debt> debts = List.of(new Debt(2L, new BigDecimal("20.00")));

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.empty());
        when(friendBalanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.updateBalancesAfterBill(bill, debts);

        ArgumentCaptor<DebtTransaction> txCaptor = ArgumentCaptor.forClass(DebtTransaction.class);
        verify(debtTransactionRepository).save(txCaptor.capture());

        DebtTransaction tx = txCaptor.getValue();
        assertEquals(2L, tx.getSenderId());     // debtor pays payer
        assertEquals(1L, tx.getReceiverId());    // payer receives
        assertEquals(new BigDecimal("20.00"), tx.getAmount());
        assertEquals(DebtTransaction.TransactionType.BILL_SPLIT, tx.getType());
    }

    // =========================================================================
    // settleUp tests
    // =========================================================================

    @Test
    @DisplayName("Settle with same user throws IllegalArgumentException")
    void settleUp_sameUser_throwsException() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                debtService.settleUp(1L, 1L)
        );
        assertTrue(ex.getMessage().contains("Cannot settle debt with yourself"));
    }

    @Test
    @DisplayName("Settle with no debt record throws EntityNotFoundException")
    void settleUp_noRecord_throwsException() {
        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () ->
                debtService.settleUp(1L, 2L)
        );
    }

    @Test
    @DisplayName("Settle with zero balance does nothing (no-op)")
    void settleUp_zeroBalance_noOp() {
        FriendBalance zeroBalance = new FriendBalance(1L, 2L);
        zeroBalance.setNetBalance(BigDecimal.ZERO);

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.of(zeroBalance));

        debtService.settleUp(1L, 2L);

        // No settlement transaction created
        verify(debtTransactionRepository, never()).save(any(DebtTransaction.class));
        // Balance unchanged
        assertEquals(BigDecimal.ZERO, zeroBalance.getNetBalance());
    }

    @Test
    @DisplayName("Settle positive balance - user2 pays user1")
    void settleUp_positiveBalance_user2PaysUser1() {
        FriendBalance balance = new FriendBalance(1L, 2L);
        balance.setNetBalance(new BigDecimal("50.00")); // user2 owes user1

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.of(balance));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(friendBalanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.settleUp(1L, 2L);

        // Verify settlement transaction: user2 (sender) pays user1 (receiver)
        ArgumentCaptor<DebtTransaction> txCaptor = ArgumentCaptor.forClass(DebtTransaction.class);
        verify(debtTransactionRepository).save(txCaptor.capture());

        DebtTransaction tx = txCaptor.getValue();
        assertEquals(2L, tx.getSenderId());     // user2 pays
        assertEquals(1L, tx.getReceiverId());    // user1 receives
        assertEquals(new BigDecimal("50.00"), tx.getAmount());
        assertEquals(DebtTransaction.TransactionType.SETTLEMENT, tx.getType());

        // Balance reset to zero
        assertEquals(BigDecimal.ZERO, balance.getNetBalance());
    }

    @Test
    @DisplayName("Settle negative balance - user1 pays user2")
    void settleUp_negativeBalance_user1PaysUser2() {
        FriendBalance balance = new FriendBalance(1L, 2L);
        balance.setNetBalance(new BigDecimal("-30.00")); // user1 owes user2

        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.of(balance));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(friendBalanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.settleUp(1L, 2L);

        // Verify settlement transaction: user1 (sender) pays user2 (receiver)
        ArgumentCaptor<DebtTransaction> txCaptor = ArgumentCaptor.forClass(DebtTransaction.class);
        verify(debtTransactionRepository).save(txCaptor.capture());

        DebtTransaction tx = txCaptor.getValue();
        assertEquals(1L, tx.getSenderId());     // user1 pays
        assertEquals(2L, tx.getReceiverId());    // user2 receives
        assertEquals(new BigDecimal("30.00"), tx.getAmount());
        assertEquals(DebtTransaction.TransactionType.SETTLEMENT, tx.getType());

        // Balance reset to zero
        assertEquals(BigDecimal.ZERO, balance.getNetBalance());
    }

    @Test
    @DisplayName("Settle normalizes userId order (user1Id > user2Id)")
    void settleUp_normalizesUserIdOrder() {
        FriendBalance balance = new FriendBalance(1L, 2L);
        balance.setNetBalance(new BigDecimal("25.00"));

        // Pass in reverse order: user1Id=2, user2Id=1
        when(friendBalanceRepository.findByUsersForUpdate(1L, 2L)).thenReturn(Optional.of(balance));
        when(debtTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(friendBalanceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        debtService.settleUp(2L, 1L);

        // Should still find the record with normalized order (1, 2)
        verify(friendBalanceRepository).findByUsersForUpdate(1L, 2L);
        // Balance reset to zero
        assertEquals(BigDecimal.ZERO, balance.getNetBalance());
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private Bill createBill(Long payerId, BigDecimal totalAmount) {
        Bill bill = new Bill();
        bill.setPayerId(payerId);
        bill.setTotalAmount(totalAmount);
        return bill;
    }
}
