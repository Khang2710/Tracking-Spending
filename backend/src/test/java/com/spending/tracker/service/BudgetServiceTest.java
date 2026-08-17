package com.spending.tracker.service;

import com.spending.tracker.entity.Budget;
import com.spending.tracker.entity.User;
import com.spending.tracker.repository.BudgetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class BudgetServiceTest {

    @Mock
    private BudgetRepository budgetRepository;

    @InjectMocks
    private BudgetService budgetService;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setEmail("budget@example.com");
    }

    @Test
    @DisplayName("Should fetch budgets for specified month")
    void getBudgets_success() {
        Budget b = new Budget(user, "TOTAL", BigDecimal.valueOf(5000000), "2026-08");
        when(budgetRepository.findByUserIdAndPeriodMonth(1L, "2026-08")).thenReturn(List.of(b));

        List<Budget> result = budgetService.getBudgets(user, "2026-08");

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("TOTAL", result.get(0).getCategory());
        assertEquals(BigDecimal.valueOf(5000000), result.get(0).getAmount());
    }

    @Test
    @DisplayName("Should update existing budget when record exists (Upsert)")
    void upsertBudget_existingRecord_updatesAmount() {
        Budget existing = new Budget(user, "Food", BigDecimal.valueOf(2000000), "2026-08");
        existing.setId(10L);

        when(budgetRepository.findByUserIdAndCategoryAndPeriodMonth(1L, "Food", "2026-08"))
                .thenReturn(Optional.of(existing));
        when(budgetRepository.save(any(Budget.class))).thenAnswer(inv -> inv.getArgument(0));

        Budget updated = budgetService.upsertBudget(user, "Food", BigDecimal.valueOf(3000000), "2026-08");

        assertNotNull(updated);
        assertEquals(10L, updated.getId());
        assertEquals(BigDecimal.valueOf(3000000), updated.getAmount());
        verify(budgetRepository, times(1)).save(existing);
    }

    @Test
    @DisplayName("Should create new budget when record does not exist")
    void upsertBudget_newRecord_createsBudget() {
        when(budgetRepository.findByUserIdAndCategoryAndPeriodMonth(1L, "Drinks", "2026-08"))
                .thenReturn(Optional.empty());
        when(budgetRepository.save(any(Budget.class))).thenAnswer(inv -> {
            Budget b = inv.getArgument(0);
            b.setId(20L);
            return b;
        });

        Budget created = budgetService.upsertBudget(user, "Drinks", BigDecimal.valueOf(1000000), "2026-08");

        assertNotNull(created);
        assertEquals(20L, created.getId());
        assertEquals("Drinks", created.getCategory());
        assertEquals(BigDecimal.valueOf(1000000), created.getAmount());
    }
}
