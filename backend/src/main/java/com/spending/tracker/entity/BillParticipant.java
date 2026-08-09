package com.spending.tracker.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "bill_participants")
public class BillParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "amount_owed", nullable = false)
    private Double amountOwed = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "split_bill_id", nullable = false)
    @JsonIgnore
    private SplitBill splitBill;

    public BillParticipant() {}

    public BillParticipant(String name, Double amountOwed, SplitBill splitBill) {
        this.name = name;
        this.amountOwed = amountOwed;
        this.splitBill = splitBill;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getAmountOwed() {
        return amountOwed;
    }

    public void setAmountOwed(Double amountOwed) {
        this.amountOwed = amountOwed;
    }

    public SplitBill getSplitBill() {
        return splitBill;
    }

    public void setSplitBill(SplitBill splitBill) {
        this.splitBill = splitBill;
    }
}
