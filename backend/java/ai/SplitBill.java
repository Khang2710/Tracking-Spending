package ai;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "split_bills")
public class SplitBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "splitBill", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BillParticipant> participants = new ArrayList<>();

    public SplitBill() {}

    public SplitBill(String title, Double totalAmount) {
        this.title = title;
        this.totalAmount = totalAmount;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Double getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Double totalAmount) {
        this.totalAmount = totalAmount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<BillParticipant> getParticipants() {
        return participants;
    }

    public void setParticipants(List<BillParticipant> participants) {
        this.participants = participants;
    }

    public void addParticipant(BillParticipant participant) {
        participants.add(participant);
        participant.setSplitBill(this);
    }
}
