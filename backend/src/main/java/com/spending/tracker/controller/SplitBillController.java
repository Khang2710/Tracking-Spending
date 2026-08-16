package com.spending.tracker.controller;

import com.spending.tracker.service.SplitBillLogic;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/split-bill")
@CrossOrigin(originPatterns = "*")
public class SplitBillController {

    public static class CalculateSplitRequest {
        private double total;
        private List<ItemRequest> items = new ArrayList<>();
        private double taxPercent;
        private double tip;

        public CalculateSplitRequest() {}

        public double getTotal() { return total; }
        public void setTotal(double total) { this.total = total; }
        public List<ItemRequest> getItems() { return items; }
        public void setItems(List<ItemRequest> items) { this.items = items; }
        public double getTaxPercent() { return taxPercent; }
        public void setTaxPercent(double taxPercent) { this.taxPercent = taxPercent; }
        public double getTip() { return tip; }
        public void setTip(double tip) { this.tip = tip; }
    }

    public static class ItemRequest {
        private String name;
        private double price;
        private List<String> consumers = new ArrayList<>();

        public ItemRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public double getPrice() { return price; }
        public void setPrice(double price) { this.price = price; }
        public List<String> getConsumers() { return consumers; }
        public void setConsumers(List<String> consumers) { this.consumers = consumers; }
    }

    @PostMapping("/calculate")
    public ResponseEntity<?> calculateSplit(@RequestBody CalculateSplitRequest request) {
        try {
            if (request.getItems() == null || request.getItems().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "items list cannot be empty"));
            }

            List<SplitBillLogic.Item> items = request.getItems().stream()
                    .map(item -> new SplitBillLogic.Item(
                            item.getName(),
                            item.getPrice(),
                            item.getConsumers()
                    ))
                    .toList();

            List<SplitBillLogic.PersonDebt> result = SplitBillLogic.calculateSplit(
                    request.getTotal(),
                    items,
                    request.getTaxPercent(),
                    request.getTip()
            );

            return ResponseEntity.ok(Map.of("splitResults", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
