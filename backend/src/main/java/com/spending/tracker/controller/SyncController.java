package com.spending.tracker.controller;

import com.spending.tracker.dto.SyncDataRequest;
import com.spending.tracker.entity.User;
import com.spending.tracker.service.SyncService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final SyncService syncService;

    @Autowired
    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    /**
     * Endpoint to fetch all initial bootstrap data (Wallets, Transactions, Savings Goals, Current Month Budgets)
     * in a single HTTP request for instant application initialization.
     *
     * @param currentUser Currently authenticated User
     * @return ResponseEntity containing AppBootstrapData
     */
    @GetMapping("/bootstrap")
    public ResponseEntity<?> getBootstrapData(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Authentication required for bootstrap data"));
        }

        try {
            com.spending.tracker.dto.AppBootstrapData bootstrapData = syncService.getBootstrapData(currentUser);
            return ResponseEntity.ok(bootstrapData);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to fetch bootstrap data: " + e.getMessage()));
        }
    }

    /**
     * Endpoint to bulk sync localStorage user data into PostgreSQL.
     * Accessible only by authenticated users (JWT verified).
     *
     * @param request     SyncDataRequest containing items to migrate
     * @param currentUser Currently authenticated User
     * @return ResponseEntity with sync status & summary metrics
     */
    @PostMapping("/bulk")
    public ResponseEntity<?> bulkSync(
            @RequestBody SyncDataRequest request,
            @AuthenticationPrincipal User currentUser) {

        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized", "message", "Authentication required for bulk sync"));
        }

        try {
            Map<String, Object> result = syncService.syncBulkData(request, currentUser);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Bad Request", "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error", "message", "Failed to sync data: " + e.getMessage()));
        }
    }
}
