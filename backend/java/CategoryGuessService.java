package ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CategoryGuessService {

    private final CategoryDictionaryRepository dictionaryRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.gemini.api-key:${GEMINI_API_KEY:}}")
    private String apiKey;

    @Value("${ai.gemini.temperature:0.2}")
    private double temperature;

    @Autowired
    public CategoryGuessService(CategoryDictionaryRepository dictionaryRepository) {
        this.dictionaryRepository = dictionaryRepository;
        this.restTemplate = new RestTemplate();
    }

    public String guessCategory(String title) {
        if (title == null || title.trim().isEmpty()) {
            return "Others";
        }

        String keyword = title.trim().toLowerCase();

        // Bước 1 - Tra cứu nhanh trong DB
        Optional<CategoryDictionary> existing = dictionaryRepository.findByKeyword(keyword);
        if (existing.isPresent()) {
            return existing.get().getCategoryName();
        }

        // Bước 2 - Viện binh AI
        String guessedCategory = "Others";
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            try {
                String promptText = String.format(
                    "Phân loại chi phí có tên '%s' vào ĐÚNG 1 trong các danh mục sau: Food, Shopping, Transport, Health, Services, Entertainment. Trả về đúng 1 từ tiếng Anh tương ứng, không giải thích.",
                    title.trim()
                );
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
                                    String aiResult = text.trim().replaceAll("[^a-zA-Z]", "");
                                    if (!aiResult.isEmpty()) {
                                        guessedCategory = aiResult;
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Gemini Category Classification failed: " + e.getMessage());
            }
        }

        // Fallback nếu không gọi được AI hoặc AI lỗi: Dựa vào từ khoá tiếng Việt cơ bản để phân loại offline
        if (guessedCategory.equalsIgnoreCase("Others")) {
            if (keyword.contains("ăn") || keyword.contains("uống") || keyword.contains("cơm") || keyword.contains("phở") || keyword.contains("bánh") || keyword.contains("trà") || keyword.contains("food") || keyword.contains("cf") || keyword.contains("cafe")) {
                guessedCategory = "Food";
            } else if (keyword.contains("xe") || keyword.contains("bus") || keyword.contains("taxi") || keyword.contains("grab") || keyword.contains("xăng") || keyword.contains("gas") || keyword.contains("oil")) {
                guessedCategory = "Transport";
            } else if (keyword.contains("mua") || keyword.contains("áo") || keyword.contains("quần") || keyword.contains("shopee") || keyword.contains("lazada") || keyword.contains("tiki")) {
                guessedCategory = "Shopping";
            } else if (keyword.contains("khám") || keyword.contains("thuốc") || keyword.contains("viện") || keyword.contains("sức khoẻ") || keyword.contains("med") || keyword.contains("doctor")) {
                guessedCategory = "Health";
            } else if (keyword.contains("chơi") || keyword.contains("game") || keyword.contains("phim") || keyword.contains("netflix") || keyword.contains("movie") || keyword.contains("vé")) {
                guessedCategory = "Entertainment";
            } else {
                guessedCategory = "Services";
            }
        }

        // Đảm bảo chữ cái đầu viết hoa cho đúng chuẩn các Category trong React app
        if (!guessedCategory.isEmpty()) {
            guessedCategory = guessedCategory.substring(0, 1).toUpperCase() + guessedCategory.substring(1).toLowerCase();
        }

        // Bước 3 - Tự học (Lưu vào DB để tái sử dụng)
        try {
            CategoryDictionary newKeyword = new CategoryDictionary(keyword, guessedCategory);
            dictionaryRepository.save(newKeyword);
        } catch (Exception e) {
            System.err.println("Failed to save new keyword to dictionary: " + e.getMessage());
        }

        return guessedCategory;
    }
}
