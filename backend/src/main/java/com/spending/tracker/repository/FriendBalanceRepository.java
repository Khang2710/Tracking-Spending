package com.spending.tracker.repository;

import com.spending.tracker.entity.FriendBalance;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface FriendBalanceRepository extends JpaRepository<FriendBalance, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FriendBalance f WHERE f.userId1 = :userId1 AND f.userId2 = :userId2")
    Optional<FriendBalance> findByUsersForUpdate(Long userId1, Long userId2);
}
