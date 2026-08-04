package ai;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class CategoryGuessController {

    private final CategoryGuessService categoryGuessService;

    @Autowired
    public CategoryGuessController(CategoryGuessService categoryGuessService) {
        this.categoryGuessService = categoryGuessService;
    }

    @GetMapping("/guess-category")
    public ResponseEntity<Map<String, Object>> guessCategory(@RequestParam String title) {
        String category = categoryGuessService.guessCategory(title);

        Map<String, Object> response = new HashMap<>();
        response.put("title", title);
        response.put("category", category);

        return ResponseEntity.ok(response);
    }
}
