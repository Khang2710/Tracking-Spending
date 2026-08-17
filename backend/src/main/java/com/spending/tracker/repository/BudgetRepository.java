package com.spending.tracker.repository;

import com.spending.tracker.entity.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByUserIdAndPeriodMonth(Long userId, String periodMonth);

    Optional<Budget> findByUserIdAndCategoryAndPeriodMonth(Long userId, String category, String periodMonth);
}
