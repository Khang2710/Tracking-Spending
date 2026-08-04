package savings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {
    List<SavingsGoal> findByUserId(Long userId);
    List<SavingsGoal> findByUserIdAndStatus(Long userId, SavingsGoal.Status status);
}
