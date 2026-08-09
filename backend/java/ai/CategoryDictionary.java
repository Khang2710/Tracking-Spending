package ai;

import jakarta.persistence.*;

@Entity
@Table(name = "category_dictionary")
public class CategoryDictionary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keyword", unique = true, nullable = false)
    private String keyword;

    @Column(name = "category_name", nullable = false)
    private String categoryName;

    public CategoryDictionary() {}

    public CategoryDictionary(String keyword, String categoryName) {
        this.keyword = keyword;
        this.categoryName = categoryName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getKeyword() {
        return keyword;
    }

    public void setKeyword(String keyword) {
        this.keyword = keyword;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }
}
