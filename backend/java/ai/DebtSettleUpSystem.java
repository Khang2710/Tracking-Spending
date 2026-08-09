package ai;

import jakarta.persistence.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// =============================================================================
// 1. DATABASE ENTITIES (JPA)
// =============================================================================

@Entity
@Table(name = "friend_balances", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id_1", "user_id_2"})
})
class FriendBalance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id_1", nullable = false)
    private Long userId1; // Always smaller than userId2

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

    // Getters and Setters
    public Long getId() { return id; }
    public Long getUserId1() { return userId1; }
    public Long getUserId2() { return userId2; }
    public BigDecimal getNetBalance() { return netBalance; }
    public void setNetBalance(BigDecimal netBalance) { this.netBalance = netBalance; }
}

@Entity
@Table(name = "bills")
class Bill {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "payer_id", nullable = false)
    private Long payerId;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPayerId() { return payerId; }
    public void setPayerId(Long payerId) { this.payerId = payerId; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
}

class Debt {
    private Long debtorId;
    private BigDecimal amount;

    public Debt(Long debtorId, BigDecimal amount) {
        this.debtorId = debtorId;
        this.amount = amount;
    }

    public Long getDebtorId() { return debtorId; }
    public BigDecimal getAmount() { return amount; }
}

@Entity
@Table(name = "transactions")
class Transaction {
    public enum TransactionType {
        BILL_SPLIT,
        SETTLEMENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TransactionType type;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Transaction() {}

    public Transaction(Long senderId, Long receiverId, BigDecimal amount, TransactionType type) {
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.amount = amount;
        this.type = type;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public Long getSenderId() { return senderId; }
    public Long getReceiverId() { return receiverId; }
    public BigDecimal getAmount() { return amount; }
    public TransactionType getType() { return type; }
}

// =============================================================================
// 2. REPOSITORIES
// =============================================================================

@Repository
interface FriendBalanceRepository extends JpaRepository<FriendBalance, Long> {
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FriendBalance f WHERE f.userId1 = :userId1 AND f.userId2 = :userId2")
    Optional<FriendBalance> findByUsersForUpdate(Long userId1, Long userId2);
}

@Repository
interface TransactionRepository extends JpaRepository<Transaction, Long> {}

// =============================================================================
// 3. SERVICE LOGIC
// =============================================================================

@Service
class DebtService {

    private final FriendBalanceRepository friendBalanceRepository;
    private final TransactionRepository transactionRepository;

    public DebtService(FriendBalanceRepository friendBalanceRepository, TransactionRepository transactionRepository) {
        this.friendBalanceRepository = friendBalanceRepository;
        this.transactionRepository = transactionRepository;
    }

    /**
     * Updates permanent friend net balances after a group bill is saved.
     * For each debtor, they owe the payer.
     *
     * @param bill         The group bill record.
     * @param parsedDebts  List of parsed individual shares.
     */
    @Transactional
    public void updateBalancesAfterBill(Bill bill, List<Debt> parsedDebts) {
        Long payerId = bill.getPayerId();

        for (Debt debt : parsedDebts) {
            Long debtorId = debt.getDebtorId();
            
            // Payer does not owe themselves
            if (debtorId.equals(payerId)) {
                continue;
            }

            BigDecimal amount = debt.getAmount();

            // Enforce userId1 < userId2 convention
            Long u1 = Math.min(payerId, debtorId);
            Long u2 = Math.max(payerId, debtorId);

            // Fetch record with pessimistic lock to prevent concurrent update anomalies
            FriendBalance friendBalance = friendBalanceRepository.findByUsersForUpdate(u1, u2)
                    .orElseGet(() -> {
                        FriendBalance fb = new FriendBalance(u1, u2);
                        return friendBalanceRepository.save(fb);
                    });

            if (payerId.equals(u1)) {
                // Payer is User 1, Debtor is User 2. User 2 owes User 1 -> netBalance increases.
                friendBalance.setNetBalance(friendBalance.getNetBalance().add(amount));
            } else {
                // Debtor is User 1, Payer is User 2. User 1 owes User 2 -> netBalance decreases.
                friendBalance.setNetBalance(friendBalance.getNetBalance().subtract(amount));
            }

            friendBalanceRepository.save(friendBalance);

            // Save individual split record as a bill split transaction
            Transaction tx = new Transaction(debtorId, payerId, amount, Transaction.TransactionType.BILL_SPLIT);
            transactionRepository.save(tx);
        }
    }

    /**
     * Settles the net debt balance between two users.
     * Resets the net balance back to zero and creates a virtual settlement transaction.
     *
     * @param user1Id First user ID.
     * @param user2Id Second user ID.
     */
    @Transactional
    public void settleUp(Long user1Id, Long user2Id) {
        if (user1Id.equals(user2Id)) {
            throw new IllegalArgumentException("Cannot settle debt with yourself");
        }

        Long u1 = Math.min(user1Id, user2Id);
        Long u2 = Math.max(user1Id, user2Id);

        // Fetch balance with pessimistic lock
        FriendBalance friendBalance = friendBalanceRepository.findByUsersForUpdate(u1, u2)
                .orElseThrow(() -> new EntityNotFoundException("No debt record found between user " + u1 + " and user " + u2));

        BigDecimal netBalance = friendBalance.getNetBalance();

        if (netBalance.compareTo(BigDecimal.ZERO) == 0) {
            return; // Already settled
        }

        Long senderId;
        Long receiverId;
        BigDecimal settlementAmount = netBalance.abs();

        if (netBalance.compareTo(BigDecimal.ZERO) > 0) {
            // netBalance > 0: User 2 owes User 1. User 2 pays User 1.
            senderId = u2;
            receiverId = u1;
        } else {
            // netBalance < 0: User 1 owes User 2. User 1 pays User 2.
            senderId = u1;
            receiverId = u2;
        }

        // 1. Create and save Settlement transaction record
        Transaction settlementTx = new Transaction(senderId, receiverId, settlementAmount, Transaction.TransactionType.SETTLEMENT);
        transactionRepository.save(settlementTx);

        // 2. Reset net balance to exactly zero
        friendBalance.setNetBalance(BigDecimal.ZERO);
        friendBalanceRepository.save(friendBalance);
    }
}
