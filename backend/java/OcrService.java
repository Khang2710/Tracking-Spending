package ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class OcrService {

    @Value("${openai.api.key:${OPENAI_KEY:}}")
    private String openAiApiKey;

    private final RestTemplate restTemplate;

    public OcrService() {
        this.restTemplate = new RestTemplate();
    }

    public static class FoodItemDto {
        private String name;
        private double price;

        public FoodItemDto() {}

        public FoodItemDto(String name, double price) {
            this.name = name;
            this.price = price;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public double getPrice() {
            return price;
        }

        public void setPrice(double price) {
            this.price = price;
        }
    }

    public List<FoodItemDto> processReceiptImage(String imageBase64, String mimeType) {
        if (openAiApiKey == null || openAiApiKey.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String safeMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType.trim() : "image/jpeg";
        String formattedBase64 = imageBase64.startsWith("data:") 
                ? imageBase64 
                : "data:" + safeMime + ";base64," + imageBase64;

        String key = openAiApiKey.trim();
        String apiUrl = "https://api.openai.com/v1/chat/completions";
        String modelName = "gpt-4o";

        if (key.startsWith("gsk_")) {
            apiUrl = "https://api.groq.com/openai/v1/chat/completions";
            modelName = "qwen/qwen3.6-27b";
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + key);

            Map<String, Object> systemMessage = new HashMap<>();
            systemMessage.put("role", "system");
            systemMessage.put("content", "Bạn là một chuyên gia AI đọc dữ liệu hoá đơn (Receipt OCR). Dựa vào hình ảnh hoá đơn này, hãy trích xuất toàn bộ các món ăn và giá tiền tương ứng.\n\n" +
                    "YÊU CẦU BẮT BUỘC VỀ GIÁ TIỀN (PRICE):\n" +
                    "1. Bắt buộc phải lấy con số ở cột \"Thành tiền\" (Total Amount = Số lượng x Đơn giá).\n" +
                    "2. TUYỆT ĐỐI KHÔNG lấy ở cột \"Đơn giá\" (Unit Price). Ví dụ: Nếu món ăn có số lượng 3.1 và đơn giá 1.150.000, thì 'price' trích xuất phải là 3565000.\n" +
                    "3. Loại bỏ toàn bộ dấu phẩy/chấm phân cách hàng nghìn (ví dụ: 3.565.000 phải viết thành 3565000).\n\n" +
                    "Tuyệt đối KHÔNG trả về markdown (không dùng ```json), KHÔNG giải thích hay thêm text nào khác. CHỈ trả về mảng JSON hoặc object JSON theo schema:\n" +
                    "{\n" +
                    "  \"items\": [\n" +
                    "    { \"name\": \"Tên món\", \"price\": 3565000 }\n" +
                    "  ],\n" +
                    "  \"currency\": \"VND\"\n" +
                    "}\n" +
                    "Bỏ qua phần thuế (Tax) và tip ở cuối hóa đơn.");

            Map<String, Object> imageUrlObj = new HashMap<>();
            imageUrlObj.put("url", formattedBase64);

            Map<String, Object> userContentItem = new HashMap<>();
            userContentItem.put("type", "image_url");
            userContentItem.put("image_url", imageUrlObj);

            Map<String, Object> userMessage = new HashMap<>();
            userMessage.put("role", "user");
            userMessage.put("content", Collections.singletonList(userContentItem));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", modelName);
            requestBody.put("messages", Arrays.asList(systemMessage, userMessage));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            if (response.getBody() != null && response.getBody().containsKey("choices")) {
                List choices = (List) response.getBody().get("choices");
                if (!choices.isEmpty()) {
                    Map firstChoice = (Map) choices.get(0);
                    Map message = (Map) firstChoice.get("message");
                    if (message != null && message.containsKey("content")) {
                        String rawContent = (String) message.get("content");
                        return parseFoodItemsJson(rawContent);
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return Collections.emptyList();
    }

    private List<FoodItemDto> parseFoodItemsJson(String rawText) {
        List<FoodItemDto> items = new ArrayList<>();
        if (rawText == null || rawText.trim().isEmpty()) return items;

        String cleanText = rawText.replaceAll("(?s)<think>.*?</think>", "").replaceAll("```json", "").replaceAll("```", "").trim();
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            List<Map<String, Object>> list = null;

            int objStart = cleanText.indexOf("{");
            int arrayStart = cleanText.indexOf("[");

            if (objStart != -1 && (arrayStart == -1 || objStart < arrayStart)) {
                int objEnd = cleanText.lastIndexOf("}");
                if (objEnd > objStart) {
                    String jsonObjStr = cleanText.substring(objStart, objEnd + 1);
                    Map<String, Object> rootMap = mapper.readValue(jsonObjStr, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                    if (rootMap.containsKey("items") && rootMap.get("items") instanceof List) {
                        list = (List<Map<String, Object>>) rootMap.get("items");
                    }
                }
            }

            if (list == null && arrayStart != -1) {
                int arrayEnd = cleanText.lastIndexOf("]");
                if (arrayEnd > arrayStart) {
                    String jsonArrayStr = cleanText.substring(arrayStart, arrayEnd + 1);
                    list = mapper.readValue(jsonArrayStr, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String, Object>>>() {});
                }
            }

            if (list != null) {
                for (Map<String, Object> map : list) {
                    Object nameObj = map.get("name") != null ? map.get("name") : map.get("item") != null ? map.get("item") : map.get("description");
                    Object priceObj = map.get("price") != null ? map.get("price") : map.get("amount") != null ? map.get("amount") : map.get("total");

                    if (nameObj != null) {
                        String name = nameObj.toString().trim();
                        double price = 0.0;
                        if (priceObj != null) {
                            try {
                                String priceStr = priceObj.toString().replaceAll("[^0-9.]", "");
                                if (!priceStr.isEmpty()) {
                                    price = Double.parseDouble(priceStr);
                                }
                            } catch (Exception ignored) {}
                        }
                        if (!name.isEmpty()) {
                            items.add(new FoodItemDto(name, price));
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        return items;
    }
}
