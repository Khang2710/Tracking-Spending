package com.spending.tracker.service;

import com.spending.tracker.dto.GeminiRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class AiNudgeService {

    @Value("${ai.gemini.api-key:${GEMINI_API_KEY:}}")
    private String apiKey;

    @Value("${ai.gemini.temperature:0.85}")
    private double temperature;

    private final RestTemplate restTemplate;

    public AiNudgeService() {
        this.restTemplate = new RestTemplate();
    }

    public String generateGenZNudgeQuote(String debtorName, String purpose, BigDecimal amount) {
        String safeName = (debtorName != null && !debtorName.trim().isEmpty()) ? debtorName.trim() : "bạn iu";
        String safePurpose = (purpose != null && !purpose.trim().isEmpty()) ? purpose.trim() : "kèo ăn uống";
        String amountFormatted = (amount != null) ? "$" + amount.toPlainString() : "tiền nợ";

        String promptText = String.format(
            "Đóng vai một người dùng mạng xã hội hệ Gen Z cực kỳ lầy lội và mỏ hỗn. Hãy sáng tác 1 câu đòi nợ thật sắc bén (dưới 15 chữ) gửi cho %s về khoản tiền %s cho việc %s. Bắt buộc phải lồng ghép khéo léo các từ lóng mạng xã hội, phong cách nói chuyện châm biếm, hoặc các câu quote đang viral/bắt trend hiện tại. Câu văn phải đậm chất 'cảm lạnh' để làm chữ nổi trên ảnh meme. Chỉ trả về kết quả kết luận, tuyệt đối không giải thích thêm.",
            safeName, amountFormatted, safePurpose
        );

        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

                GeminiRequest requestPayload = new GeminiRequest(promptText, temperature);

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<GeminiRequest> entity = new HttpEntity<>(requestPayload, headers);
                ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

                if (response.getBody() != null && response.getBody().containsKey("candidates")) {
                    List candidates = (List) response.getBody().get("candidates");
                    if (!candidates.isEmpty()) {
                        Map firstCandidate = (Map) candidates.get(0);
                        Map content = (Map) firstCandidate.get("content");
                        if (content != null && content.containsKey("parts")) {
                            List parts = (List) content.get("parts");
                            if (!parts.isEmpty()) {
                                Map firstPart = (Map) parts.get(0);
                                String text = (String) firstPart.get("text");
                                if (text != null && !text.trim().isEmpty()) {
                                    return text.trim().replaceAll("^\"|\"$", "");
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Gemini API Call failed, switching to Gen Z fallback quote: " + e.getMessage());
            }
        }

        // Fallback Gen Z Meme Quote Engine
        return getFallbackGenZQuote(safeName, safePurpose, amountFormatted);
    }

    private String getFallbackGenZQuote(String debtorName, String purpose, String amount) {
        String[] templates = new String[]{
            String.format("%s ơi, trả %s tiền %s rồi làm gì làm nè!", debtorName, amount, purpose),
            String.format("Tình nghĩa %s chắc có bền lâu khi %s tiền %s chưa trả?", debtorName, amount, purpose),
            String.format("Alo %s, %s vụ %s sắp đóng băng vì chờ tiền đó!", debtorName, amount, purpose),
            String.format("Sống là phải biết điều, trả %s tiền %s giùm %s nha!", amount, purpose, debtorName),
            String.format("%s tính sống chill nhưng %s tiền %s không trả là flex xui đó!", debtorName, amount, purpose),
            String.format("Đừng để kèo %s thành nỗi đau, bank ngay %s nào %s ơi!", purpose, amount, debtorName)
        };
        return templates[new Random().nextInt(templates.length)];
    }
}
