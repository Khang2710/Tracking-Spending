package com.spending.tracker.service;

import com.spending.tracker.entity.User;
import com.spending.tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Finds an existing user by auth_id or email, or auto-provisions a new user record.
     *
     * @param authId Supabase UUID (from JWT 'sub' claim)
     * @param email  User's email address (from JWT 'email' claim)
     * @return User entity (persisted)
     */
    @Transactional
    public User getOrCreateUser(String authId, String email) {
        if (authId == null || authId.isBlank()) {
            throw new IllegalArgumentException("auth_id must not be empty");
        }

        // 1. Check if user exists by Supabase auth_id
        Optional<User> userByAuthId = userRepository.findByAuthId(authId);
        if (userByAuthId.isPresent()) {
            User existing = userByAuthId.get();
            // Update email if changed in Supabase
            if (email != null && !email.isBlank() && !email.equals(existing.getEmail())) {
                existing.setEmail(email);
                return userRepository.save(existing);
            }
            return existing;
        }

        // 2. Fallback: Check if user exists by email (e.g. multi-device or OAuth link)
        if (email != null && !email.isBlank() && !email.endsWith("@placeholder.supabase")) {
            Optional<User> userByEmail = userRepository.findByEmail(email);
            if (userByEmail.isPresent()) {
                User existing = userByEmail.get();
                existing.setAuthId(authId);
                return userRepository.save(existing);
            }
        }

        // 3. Auto-provision new user
        String userEmail = (email != null && !email.isBlank()) ? email : authId + "@placeholder.supabase";
        User newUser = new User();
        newUser.setAuthId(authId);
        newUser.setEmail(userEmail);
        newUser.setCurrencyPreference("VND");
        return userRepository.save(newUser);
    }

    public Optional<User> findByAuthId(String authId) {
        return userRepository.findByAuthId(authId);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
