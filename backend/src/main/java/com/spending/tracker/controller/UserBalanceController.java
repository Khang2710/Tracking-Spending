package com.spending.tracker.controller;

import com.spending.tracker.service.UserBalanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/balance")
@CrossOrigin(originPatterns = "*")
public class UserBalanceController {

    private final UserBalanceService userBalanceService;

    @Autowired
    public UserBalanceController(UserBalanceService userBalanceService) {
        this.userBalanceService = userBalanceService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getBalances(@PathVariable Long userId) {
        try {
            BigDecimal totalBalance = userBalanceService.getTotalBalance(userId);
            BigDecimal availableBalance = userBalanceService.getAvailableBalance(userId);
            return ResponseEntity.ok(Map.of(
                    "userId", userId,
                    "totalBalance", totalBalance,
                    "availableBalance", availableBalance
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{userId}/available")
    public ResponseEntity<?> getAvailableBalance(@PathVariable Long userId) {
        try {
            BigDecimal availableBalance = userBalanceService.getAvailableBalance(userId);
            return ResponseEntity.ok(Map.of(
                    "userId", userId,
                    "availableBalance", availableBalance
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
