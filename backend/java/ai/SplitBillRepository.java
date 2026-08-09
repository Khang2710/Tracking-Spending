package ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SplitBillRepository extends JpaRepository<SplitBill, Long> {
    List<SplitBill> findAllByOrderByCreatedAtDesc();
}
