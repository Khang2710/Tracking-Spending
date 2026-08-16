package com.spending.tracker.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "friend_balances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id_1", "user_id_2"})
})
public class FriendBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id_1", nullable = false)
    private Long userId1;

    @Column(name = "user_id_2", nullable = false)
    private Long userId2;

    // net_balance > 0: user 1 is lending to user 2 (user 2 owes user 1)
    // net_balance < 0: user 1 owes user 2 (user 2 is lending to user 1)
    @Column(name = "net_balance", nullable = false, precision = 12, scale = 2)
    private BigDecimal netBalance = BigDecimal.ZERO;

    public FriendBalance() {}

    public FriendBalance(Long userId1, Long userId2) {
        if (userId1 >= userId2) {
            throw new IllegalArgumentException("userId1 must be strictly less than userId2");
        }
        this.userId1 = userId1;
        this.userId2 = userId2;
        this.netBalance = BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    public Long getUserId1() { return userId1; }
    public Long getUserId2() { return userId2; }
    public BigDecimal getNetBalance() { return netBalance; }
    public void setNetBalance(BigDecimal netBalance) { this.netBalance = netBalance; }
}
