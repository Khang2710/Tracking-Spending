package com.spending.tracker.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(
    name = "budgets",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_category_period", columnNames = {"user_id", "category", "period_month"})
    }
)
public class Budget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(name = "category", nullable = true, length = 50)
    private String category;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "period_month", nullable = false)
    private String periodMonth;

    public Budget() {}

    public Budget(User user, String category, BigDecimal amount, String periodMonth) {
        this.user = user;
        this.category = category;
        this.amount = amount;
        this.periodMonth = periodMonth;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPeriodMonth() {
        return periodMonth;
    }

    public void setPeriodMonth(String periodMonth) {
        this.periodMonth = periodMonth;
    }
}
