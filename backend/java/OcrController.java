package ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ocr")
@CrossOrigin(origins = "*")
public class OcrController {

    private final OcrService ocrService;

    @Autowired
    public OcrController(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    public static class OcrRequest {
        private String imageBase64;
        private String mimeType;

        public OcrRequest() {}

        public OcrRequest(String imageBase64, String mimeType) {
            this.imageBase64 = imageBase64;
            this.mimeType = mimeType;
        }

        public String getImageBase64() {
            return imageBase64;
        }

        public void setImageBase64(String imageBase64) {
            this.imageBase64 = imageBase64;
        }

        public String getMimeType() {
            return mimeType;
        }

        public void setMimeType(String mimeType) {
            this.mimeType = mimeType;
        }
    }

    @PostMapping("/scan")
    public ResponseEntity<List<OcrService.FoodItemDto>> scanReceipt(@RequestBody OcrRequest request) {
        if (request == null || request.getImageBase64() == null || request.getImageBase64().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<OcrService.FoodItemDto> items = ocrService.processReceiptImage(request.getImageBase64(), request.getMimeType());
        return ResponseEntity.ok(items);
    }
}
