package com.spending.tracker.repository;

import com.spending.tracker.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Long> {
    List<Wallet> findByUserId(Long userId);
    List<Wallet> findByUserIdOrderByIdAsc(Long userId);
}
