package com.spending.tracker.controller;

import com.spending.tracker.entity.User;
import com.spending.tracker.entity.Wallet;
import com.spending.tracker.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    private final WalletRepository walletRepository;

    @Autowired
    public WalletController(WalletRepository walletRepository) {
        this.walletRepository = walletRepository;
    }

    @GetMapping
    public ResponseEntity<?> getWallets(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        List<Wallet> wallets = walletRepository.findByUserIdOrderByIdAsc(currentUser.getId());
        return ResponseEntity.ok(wallets);
    }

    @PostMapping
    public ResponseEntity<?> createWallet(
            @RequestBody Wallet wallet,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        wallet.setUser(currentUser);
        Wallet saved = walletRepository.save(wallet);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateWallet(
            @PathVariable Long id,
            @RequestBody Wallet walletDetails,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        return walletRepository.findById(id)
                .map(wallet -> {
                    if (!wallet.getUser().getId().equals(currentUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
                    }
                    if (walletDetails.getName() != null) wallet.setName(walletDetails.getName());
                    if (walletDetails.getBalance() != null) wallet.setBalance(walletDetails.getBalance());
                    return ResponseEntity.ok(walletRepository.save(wallet));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWallet(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        return walletRepository.findById(id)
                .map(wallet -> {
                    if (!wallet.getUser().getId().equals(currentUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
                    }
                    walletRepository.delete(wallet);
                    return ResponseEntity.ok(Map.of("message", "Wallet deleted successfully"));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
