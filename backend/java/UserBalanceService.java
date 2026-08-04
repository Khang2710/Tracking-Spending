package savings;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class UserBalanceService {

    private final SavingsGoalRepository goalRepository;

    @Autowired
    public UserBalanceService(SavingsGoalRepository goalRepository) {
        this.goalRepository = goalRepository;
    }

    /**
     * Retrieve the user's Total Balance.
     * In a production system, this would query a WalletRepository or AccountRepository.
     */
    public BigDecimal getTotalBalance(Long userId) {
        // Mock default total balance of $5000.00 for demo purposes
        return new BigDecimal("5000.00");
    }

    /**
     * Calculate Available Balance according to the formula:
     * [Available Balance] = [Total Balance] - [Sum of currentAmount of all active (IN_PROGRESS) Savings Goals]
     */
    @Transactional(readOnly = true)
    public BigDecimal getAvailableBalance(Long userId) {
        BigDecimal totalBalance = getTotalBalance(userId);

        // Fetch all active goals (IN_PROGRESS) for this user
        List<SavingsGoal> activeGoals = goalRepository.findByUserIdAndStatus(userId, SavingsGoal.Status.IN_PROGRESS);

        // Sum their currentAmount
        BigDecimal lockedAmount = activeGoals.stream()
                .map(SavingsGoal::getCurrentAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Return Available Balance (guaranteed non-negative)
        BigDecimal available = totalBalance.subtract(lockedAmount);
        return available.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : available;
    }
}
