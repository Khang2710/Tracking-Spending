package com.spending.tracker.controller;

import com.spending.tracker.dto.SavingsGoalDto;
import com.spending.tracker.entity.SavingsGoal;
import com.spending.tracker.service.SavingsGoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/savings-goals")
@CrossOrigin(originPatterns = "*")
public class SavingsGoalController {

    private final SavingsGoalService savingsGoalService;

    @Autowired
    public SavingsGoalController(SavingsGoalService savingsGoalService) {
        this.savingsGoalService = savingsGoalService;
    }

    public static class AmountRequest {
        private BigDecimal amount;

        public AmountRequest() {}

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    @PostMapping
    public ResponseEntity<?> createGoal(@RequestBody SavingsGoalDto dto) {
        try {
            if (dto.getUserId() == null || dto.getTitle() == null || dto.getTargetAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId, title, and targetAmount are required"));
            }
            if (dto.getTargetAmount().compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "targetAmount must be positive"));
            }
            SavingsGoal goal = savingsGoalService.createGoal(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(goal);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getGoalsByUser(@PathVariable Long userId) {
        try {
            List<SavingsGoal> goals = savingsGoalService.getGoalsByUser(userId);
            List<Map<String, Object>> enriched = goals.stream().map(this::buildGoalResponse).toList();
            return ResponseEntity.ok(enriched);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{goalId}/deposit")
    public ResponseEntity<?> depositToGoal(@PathVariable Long goalId, @RequestBody AmountRequest request) {
        try {
            if (request.getAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "amount is required"));
            }
            SavingsGoal goal = savingsGoalService.depositToGoal(goalId, request.getAmount());
            return ResponseEntity.ok(buildGoalResponse(goal));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{goalId}/withdraw")
    public ResponseEntity<?> withdrawFromGoal(@PathVariable Long goalId, @RequestBody AmountRequest request) {
        try {
            if (request.getAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "amount is required"));
            }
            SavingsGoal goal = savingsGoalService.withdrawFromGoal(goalId, request.getAmount());
            return ResponseEntity.ok(buildGoalResponse(goal));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> buildGoalResponse(SavingsGoal goal) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", goal.getId());
        map.put("userId", goal.getUserId());
        map.put("title", goal.getTitle());
        map.put("targetAmount", goal.getTargetAmount());
        map.put("currentAmount", goal.getCurrentAmount());
        map.put("icon", goal.getIcon());
        map.put("color", goal.getColor());
        map.put("deadline", goal.getDeadline());
        map.put("status", goal.getStatus().name());
        map.put("progressPercentage", savingsGoalService.getProgressPercentage(goal));
        return map;
    }
}
