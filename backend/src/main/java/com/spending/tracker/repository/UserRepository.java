package com.spending.tracker.repository;

import com.spending.tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByAuthId(String authId);
    Optional<User> findByEmail(String email);
    boolean existsByAuthId(String authId);
    boolean existsByEmail(String email);
}
