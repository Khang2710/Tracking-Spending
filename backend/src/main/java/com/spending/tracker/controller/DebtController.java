package com.spending.tracker.controller;

import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.Debt;
import com.spending.tracker.service.DebtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/debts")
@CrossOrigin(originPatterns = "*")
public class DebtController {

    private final DebtService debtService;

    @Autowired
    public DebtController(DebtService debtService) {
        this.debtService = debtService;
    }

    public static class BillSplitRequest {
        private Long payerId;
        private BigDecimal totalAmount;
        private List<DebtItem> debts = new ArrayList<>();

        public BillSplitRequest() {}

        public Long getPayerId() { return payerId; }
        public void setPayerId(Long payerId) { this.payerId = payerId; }
        public BigDecimal getTotalAmount() { return totalAmount; }
        public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
        public List<DebtItem> getDebts() { return debts; }
        public void setDebts(List<DebtItem> debts) { this.debts = debts; }
    }

    public static class DebtItem {
        private Long debtorId;
        private BigDecimal amount;

        public DebtItem() {}

        public Long getDebtorId() { return debtorId; }
        public void setDebtorId(Long debtorId) { this.debtorId = debtorId; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
    }

    public static class SettleRequest {
        private Long user1Id;
        private Long user2Id;

        public SettleRequest() {}

        public Long getUser1Id() { return user1Id; }
        public void setUser1Id(Long user1Id) { this.user1Id = user1Id; }
        public Long getUser2Id() { return user2Id; }
        public void setUser2Id(Long user2Id) { this.user2Id = user2Id; }
    }

    @PostMapping("/split-bill")
    public ResponseEntity<?> splitBill(@RequestBody BillSplitRequest request) {
        try {
            if (request.getPayerId() == null || request.getTotalAmount() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "payerId and totalAmount are required"));
            }
            if (request.getDebts() == null || request.getDebts().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "debts list cannot be empty"));
            }

            Bill bill = new Bill();
            bill.setPayerId(request.getPayerId());
            bill.setTotalAmount(request.getTotalAmount());

            List<Debt> parsedDebts = request.getDebts().stream()
                    .map(d -> new Debt(d.getDebtorId(), d.getAmount()))
                    .toList();

            debtService.updateBalancesAfterBill(bill, parsedDebts);

            return ResponseEntity.ok(Map.of("message", "Bill split processed successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/settle")
    public ResponseEntity<?> settleUp(@RequestBody SettleRequest request) {
        try {
            if (request.getUser1Id() == null || request.getUser2Id() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "user1Id and user2Id are required"));
            }

            debtService.settleUp(request.getUser1Id(), request.getUser2Id());

            return ResponseEntity.ok(Map.of("message", "Debt settled successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
