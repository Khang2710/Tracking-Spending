package com.spending.tracker.entity;

import java.math.BigDecimal;

public class Debt {
    private Long debtorId;
    private BigDecimal amount;

    public Debt() {}

    public Debt(Long debtorId, BigDecimal amount) {
        this.debtorId = debtorId;
        this.amount = amount;
    }

    public Long getDebtorId() { return debtorId; }
    public void setDebtorId(Long debtorId) { this.debtorId = debtorId; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
