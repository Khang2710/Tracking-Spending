package com.spending.tracker.repository;

import com.spending.tracker.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // 1. Lấy tất cả giao dịch thuộc về một Ví cụ thể
    List<Transaction> findByWalletId(Long walletId);

    // 2. Lấy danh sách giao dịch thuộc Ví trong một khoảng thời gian (Derived Query Method)
    List<Transaction> findByWalletIdAndDateBetween(Long walletId, LocalDateTime startDate, LocalDateTime endDate);

    // 3. Custom Query (JPQL): Lấy tất cả giao dịch của một ví trong tháng này (Sắp xếp mới nhất lên đầu)
    @Query("SELECT t FROM Transaction t WHERE t.wallet.id = :walletId AND t.date >= :startDate AND t.date <= :endDate ORDER BY t.date DESC")
    List<Transaction> findTransactionsByWalletAndDateRange(
        @Param("walletId") Long walletId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    // 4. Custom Query (JPQL): Tính tổng chi tiêu (OUTCOME) của ví trong tháng này
    @Query("SELECT COALESCE(SUM(t.amount), 0.0) FROM Transaction t WHERE t.wallet.id = :walletId AND t.type = 'OUTCOME' AND t.date >= :startDate AND t.date <= :endDate")
    Double calculateTotalSpentInMonth(
        @Param("walletId") Long walletId,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );
}
