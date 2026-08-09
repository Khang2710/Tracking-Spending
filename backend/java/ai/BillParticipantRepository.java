package ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BillParticipantRepository extends JpaRepository<BillParticipant, Long> {
    List<BillParticipant> findBySplitBillId(Long splitBillId);
}
