package com.spending.tracker.controller;

import com.spending.tracker.entity.Budget;
import com.spending.tracker.entity.User;
import com.spending.tracker.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budgets")
@CrossOrigin(originPatterns = "*")
public class BudgetController {

    private final BudgetService budgetService;

    @Autowired
    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    /**
     * Fetch budget configurations for a specific month (YYYY-MM).
     */
    @GetMapping
    public ResponseEntity<?> getBudgets(
            @RequestParam(name = "month", required = false) String month,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Authentication required"));
        }

        String periodMonth = (month != null && !month.isBlank())
                ? month
                : LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

        try {
            List<Budget> budgets = budgetService.getBudgets(currentUser, periodMonth);
            return ResponseEntity.ok(budgets);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", e.getMessage()));
        }
    }

    /**
     * Create or update budget configuration (Upsert logic).
     */
    @PostMapping
    public ResponseEntity<?> saveBudget(
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Authentication required"));
        }

        if (payload == null || payload.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", "Payload must not be empty"));
        }

        String periodMonth = (String) payload.get("periodMonth");
        if (periodMonth == null || periodMonth.isBlank()) {
            periodMonth = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        }

        try {
            // Case 1: Bulk budget payload (totalBudget + categoryBudgets)
            if (payload.containsKey("totalBudget") || payload.containsKey("categoryBudgets")) {
                BigDecimal totalBudget = null;
                if (payload.get("totalBudget") != null && !payload.get("totalBudget").toString().isBlank()) {
                    totalBudget = new BigDecimal(payload.get("totalBudget").toString());
                }

                Map<String, BigDecimal> categoryBudgetsMap = null;
                if (payload.get("categoryBudgets") instanceof Map) {
                    categoryBudgetsMap = new java.util.HashMap<>();
                    Map<?, ?> rawMap = (Map<?, ?>) payload.get("categoryBudgets");
                    for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                        if (entry.getKey() != null && entry.getValue() != null && !entry.getValue().toString().isBlank()) {
                            categoryBudgetsMap.put(entry.getKey().toString(), new BigDecimal(entry.getValue().toString()));
                        }
                    }
                }

                List<Budget> saved = budgetService.upsertBudgetsBulk(currentUser, periodMonth, totalBudget, categoryBudgetsMap);
                return ResponseEntity.ok(saved);
            }

            // Case 2: Single category budget payload
            String category = (String) payload.get("category");
            Object rawAmount = payload.get("amount");

            if (category == null || category.isBlank() || rawAmount == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Bad Request", "message", "category and amount are required"));
            }

            BigDecimal amount = new BigDecimal(rawAmount.toString());
            Budget saved = budgetService.upsertBudget(currentUser, category, amount, periodMonth);
            return ResponseEntity.ok(saved);

        } catch (IllegalArgumentException e) {
            java.util.Map<String, String> errMap = new java.util.HashMap<>();
            errMap.put("error", "Bad Request");
            errMap.put("message", e.getMessage() != null ? e.getMessage() : e.toString());
            return ResponseEntity.badRequest().body(errMap);
        } catch (Exception e) {
            e.printStackTrace();
            java.util.Map<String, String> errMap = new java.util.HashMap<>();
            errMap.put("error", "Internal Server Error");
            errMap.put("message", e.getMessage() != null ? e.getMessage() : e.toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errMap);
        }
    }
}
