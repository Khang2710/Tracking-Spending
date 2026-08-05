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
            systemMessage.put("content", "You are an advanced financial AI assistant specialized in extracting structured data from receipts and invoices. " +
                    "Analyze the provided image of a receipt and extract the purchased items and the currency used.\n\n" +
                    "You must respond ONLY with a valid JSON object matching the exact schema below. Do not include any markdown formatting tags (like ```json), explanations, or extra text.\n\n" +
                    "JSON Schema:\n" +
                    "{\n" +
                    "  \"items\": [\n" +
                    "    {\n" +
                    "      \"name\": \"string (The name of the food, drink, or item)\",\n" +
                    "      \"price\": number (The exact price of the item. Do not include currency symbols. Use decimals if necessary, e.g., 15.50 or 150000)\n" +
                    "    }\n" +
                    "  ],\n" +
                    "  \"currency\": \"string (The 3-letter ISO currency code, e.g. 'VND', 'USD')\"\n" +
                    "}\n\n" +
                    "Rules:\n" +
                    "1. \"price\" must be a pure number. Remove any commas/dots used as thousand separators (e.g., \"3.565.000\" -> 3565000).\n" +
                    "2. Do not include markdown code block tags.");

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
