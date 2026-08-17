package com.spending.tracker.service;

import com.spending.tracker.entity.Budget;
import com.spending.tracker.entity.User;
import com.spending.tracker.repository.BudgetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;

    @Autowired
    public BudgetService(BudgetRepository budgetRepository) {
        this.budgetRepository = budgetRepository;
    }

    public List<Budget> getBudgets(User user, String periodMonth) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User context required");
        }
        if (periodMonth == null || periodMonth.isBlank()) {
            throw new IllegalArgumentException("Period month is required (YYYY-MM)");
        }
        return budgetRepository.findByUserIdAndPeriodMonth(user.getId(), periodMonth);
    }

    @Transactional
    public Budget upsertBudget(User user, String category, BigDecimal amount, String periodMonth) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User context required");
        }
        if (category == null || category.isBlank()) {
            throw new IllegalArgumentException("Category is required");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Amount must be non-negative");
        }
        if (periodMonth == null || periodMonth.isBlank()) {
            throw new IllegalArgumentException("Period month is required (YYYY-MM)");
        }

        Optional<Budget> existing = budgetRepository.findByUserIdAndCategoryAndPeriodMonth(
                user.getId(), category, periodMonth
        );

        if (existing.isPresent()) {
            Budget b = existing.get();
            b.setAmount(amount);
            return budgetRepository.save(b);
        }

        Budget newBudget = new Budget(user, category, amount, periodMonth);
        return budgetRepository.save(newBudget);
    }

    @Transactional
    public List<Budget> upsertBudgetsBulk(
            User user,
            String periodMonth,
            BigDecimal totalBudget,
            Map<String, BigDecimal> categoryBudgets) {

        List<Budget> result = new ArrayList<>();

        if (totalBudget != null) {
            result.add(upsertBudget(user, "TOTAL", totalBudget, periodMonth));
        }

        if (categoryBudgets != null && !categoryBudgets.isEmpty()) {
            for (Map.Entry<String, BigDecimal> entry : categoryBudgets.entrySet()) {
                if (entry.getKey() != null && !entry.getKey().isBlank()) {
                    result.add(upsertBudget(user, entry.getKey(), entry.getValue(), periodMonth));
                }
            }
        }

        return result;
    }
}
