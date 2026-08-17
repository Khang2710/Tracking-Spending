package com.spending.tracker.controller;

import com.spending.tracker.entity.Transaction;
import com.spending.tracker.entity.User;
import com.spending.tracker.entity.Wallet;
import com.spending.tracker.repository.TransactionRepository;
import com.spending.tracker.repository.WalletRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;

    @Autowired
    public TransactionController(TransactionRepository transactionRepository, WalletRepository walletRepository) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
    }

    @GetMapping
    public ResponseEntity<?> getTransactions(@AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        List<Wallet> userWallets = walletRepository.findByUserIdOrderByIdAsc(currentUser.getId());
        List<Transaction> allTransactions = new ArrayList<>();
        for (Wallet w : userWallets) {
            allTransactions.addAll(transactionRepository.findByWalletId(w.getId()));
        }
        return ResponseEntity.ok(allTransactions);
    }

    @PostMapping
    public ResponseEntity<?> createTransaction(
            @RequestBody Transaction transaction,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        
        List<Wallet> userWallets = walletRepository.findByUserIdOrderByIdAsc(currentUser.getId());
        if (userWallets.isEmpty()) {
            Wallet defaultWallet = walletRepository.save(new Wallet("Ví chính", 0.0, currentUser));
            transaction.setWallet(defaultWallet);
        } else if (transaction.getWallet() == null || transaction.getWallet().getId() == null) {
            transaction.setWallet(userWallets.get(0));
        }

        Transaction saved = transactionRepository.save(transaction);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTransaction(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }
        return transactionRepository.findById(id)
                .map(tx -> {
                    if (tx.getWallet() != null && tx.getWallet().getUser() != null &&
                        !tx.getWallet().getUser().getId().equals(currentUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
                    }
                    transactionRepository.delete(tx);
                    return ResponseEntity.ok(Map.of("message", "Transaction deleted successfully"));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
