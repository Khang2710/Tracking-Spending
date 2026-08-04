package ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiNudgeController {

    private final AiNudgeService aiNudgeService;

    @Autowired
    public AiNudgeController(AiNudgeService aiNudgeService) {
        this.aiNudgeService = aiNudgeService;
    }

    public static class NudgeRequest {
        private String debtorName;
        private String purpose;
        private BigDecimal amount;

        public NudgeRequest() {}

        public NudgeRequest(String debtorName, String purpose, BigDecimal amount) {
            this.debtorName = debtorName;
            this.purpose = purpose;
            this.amount = amount;
        }

        public String getDebtorName() {
            return debtorName;
        }

        public void setDebtorName(String debtorName) {
            this.debtorName = debtorName;
        }

        public String getPurpose() {
            return purpose;
        }

        public void setPurpose(String purpose) {
            this.purpose = purpose;
        }

        public BigDecimal getAmount() {
            return amount;
        }

        public void setAmount(BigDecimal amount) {
            this.amount = amount;
        }
    }

    @PostMapping("/nudge-quote")
    public ResponseEntity<Map<String, Object>> generateNudgeQuotePost(@RequestBody NudgeRequest request) {
        String quote = aiNudgeService.generateGenZNudgeQuote(
            request.getDebtorName(),
            request.getPurpose(),
            request.getAmount()
        );

        Map<String, Object> response = new HashMap<>();
        response.put("quote", quote);
        response.put("debtorName", request.getDebtorName());
        response.put("purpose", request.getPurpose());
        response.put("amount", request.getAmount());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/nudge-quote")
    public ResponseEntity<Map<String, Object>> generateNudgeQuoteGet(
            @RequestParam(required = false, defaultValue = "Bạn ơi") String debtorName,
            @RequestParam(required = false, defaultValue = "Kèo tụ tập") String purpose,
            @RequestParam(required = false, defaultValue = "0") BigDecimal amount) {
        
        String quote = aiNudgeService.generateGenZNudgeQuote(debtorName, purpose, amount);

        Map<String, Object> response = new HashMap<>();
        response.put("quote", quote);
        response.put("debtorName", debtorName);
        response.put("purpose", purpose);
        response.put("amount", amount);

        return ResponseEntity.ok(response);
    }
}
