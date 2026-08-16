package com.spending.tracker.repository;

import com.spending.tracker.entity.DebtTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebtTransactionRepository extends JpaRepository<DebtTransaction, Long> {
}
