package com.spending.tracker.service;

import com.spending.tracker.entity.User;
import com.spending.tracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private final String authId = "123e4567-e89b-12d3-a456-426614174000";
    private final String email = "testuser@example.com";

    @Test
    @DisplayName("Should return existing user when found by auth_id")
    void getOrCreateUser_existingUserByAuthId() {
        User existingUser = new User();
        existingUser.setId(1L);
        existingUser.setAuthId(authId);
        existingUser.setEmail(email);

        when(userRepository.findByAuthId(authId)).thenReturn(Optional.of(existingUser));

        User result = userService.getOrCreateUser(authId, email);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(authId, result.getAuthId());
        assertEquals(email, result.getEmail());

        verify(userRepository, times(1)).findByAuthId(authId);
        verify(userRepository, never()).findByEmail(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should update auth_id and return user when found by email")
    void getOrCreateUser_existingUserByEmail() {
        User existingUser = new User();
        existingUser.setId(2L);
        existingUser.setEmail(email);

        when(userRepository.findByAuthId(authId)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.getOrCreateUser(authId, email);

        assertNotNull(result);
        assertEquals(2L, result.getId());
        assertEquals(authId, result.getAuthId());
        assertEquals(email, result.getEmail());

        verify(userRepository, times(1)).findByAuthId(authId);
        verify(userRepository, times(1)).findByEmail(email);
        verify(userRepository, times(1)).save(existingUser);
    }

    @Test
    @DisplayName("Should auto-provision new user when not found by auth_id or email")
    void getOrCreateUser_autoProvisionNewUser() {
        when(userRepository.findByAuthId(authId)).thenReturn(Optional.empty());
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(3L);
            return u;
        });

        User result = userService.getOrCreateUser(authId, email);

        assertNotNull(result);
        assertEquals(3L, result.getId());
        assertEquals(authId, result.getAuthId());
        assertEquals(email, result.getEmail());
        assertEquals("VND", result.getCurrencyPreference());

        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when auth_id is blank")
    void getOrCreateUser_blankAuthId_throwsException() {
        assertThrows(IllegalArgumentException.class, () -> userService.getOrCreateUser("", email));
        assertThrows(IllegalArgumentException.class, () -> userService.getOrCreateUser(null, email));
    }
}
