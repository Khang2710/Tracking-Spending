package savings;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class SavingsGoalService {

    private final SavingsGoalRepository goalRepository;
    private final UserBalanceService userBalanceService;

    @Autowired
    public SavingsGoalService(SavingsGoalRepository goalRepository, UserBalanceService userBalanceService) {
        this.goalRepository = goalRepository;
        this.userBalanceService = userBalanceService;
    }

    @Transactional
    public SavingsGoal createGoal(SavingsGoalDto dto) {
        SavingsGoal goal = new SavingsGoal();
        goal.setUserId(dto.getUserId());
        goal.setTitle(dto.getTitle());
        goal.setTargetAmount(dto.getTargetAmount());
        goal.setCurrentAmount(dto.getCurrentAmount() != null ? dto.getCurrentAmount() : BigDecimal.ZERO);
        goal.setIcon(dto.getIcon());
        goal.setColor(dto.getColor());
        goal.setDeadline(dto.getDeadline());
        goal.setStatus(SavingsGoal.Status.IN_PROGRESS);
        return goalRepository.save(goal);
    }

    @Transactional
    public SavingsGoal depositToGoal(Long goalId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }

        SavingsGoal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Savings Goal not found with id: " + goalId));

        if (goal.getStatus() == SavingsGoal.Status.COMPLETED) {
            throw new IllegalStateException("Savings Goal is already completed");
        }

        BigDecimal availableBalance = userBalanceService.getAvailableBalance(goal.getUserId());
        if (availableBalance.compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient available balance");
        }

        BigDecimal newCurrent = goal.getCurrentAmount().add(amount);
        goal.setCurrentAmount(newCurrent);

        if (newCurrent.compareTo(goal.getTargetAmount()) >= 0) {
            goal.setStatus(SavingsGoal.Status.COMPLETED);
        }

        return goalRepository.save(goal);
    }

    @Transactional
    public SavingsGoal withdrawFromGoal(Long goalId, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Withdraw amount must be positive");
        }

        SavingsGoal goal = goalRepository.findById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("Savings Goal not found with id: " + goalId));

        if (goal.getCurrentAmount().compareTo(amount) < 0) {
            throw new IllegalArgumentException("Insufficient goal savings to withdraw");
        }

        BigDecimal newCurrent = goal.getCurrentAmount().subtract(amount);
        goal.setCurrentAmount(newCurrent);

        // If amount drops below target, revert status to IN_PROGRESS
        if (newCurrent.compareTo(goal.getTargetAmount()) < 0) {
            goal.setStatus(SavingsGoal.Status.IN_PROGRESS);
        }

        return goalRepository.save(goal);
    }

    @Transactional(readOnly = true)
    public List<SavingsGoal> getGoalsByUser(Long userId) {
        return goalRepository.findByUserId(userId);
    }

    // Helper class or method to calculate progress percentage
    public double getProgressPercentage(SavingsGoal goal) {
        if (goal.getTargetAmount().compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }
        BigDecimal pct = goal.getCurrentAmount()
                .multiply(new BigDecimal("100"))
                .divide(goal.getTargetAmount(), 2, java.math.RoundingMode.HALF_UP);
        return Math.min(100.0, pct.doubleValue());
    }
}
