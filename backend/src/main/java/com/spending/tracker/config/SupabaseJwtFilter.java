package com.spending.tracker.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spending.tracker.entity.User;
import com.spending.tracker.service.UserService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;

@Component
public class SupabaseJwtFilter extends OncePerRequestFilter {

    private final UserService userService;
    private final String jwtSecret;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public SupabaseJwtFilter(
            UserService userService,
            @Value("${supabase.jwt.secret:mpRyH9VlkSSjrdTb56m5Z5mv4yO5p67okVrK7f97cO3nSoj9PCt6wk6ttau2blNBfivGbR+mKIfD9EQUMR/vYw==}") String jwtSecret) {
        this.userService = userService;
        this.jwtSecret = jwtSecret;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();
        String authId = null;
        String email = null;

        // 1. Try verifying signature with candidate keys
        SecretKey[] candidateKeys = createCandidateKeys(jwtSecret);
        for (SecretKey key : candidateKeys) {
            if (key == null) continue;
            try {
                Claims claims = Jwts.parser()
                        .verifyWith(key)
                        .build()
                        .parseSignedClaims(token)
                        .getPayload();
                authId = claims.getSubject();
                email = claims.get("email", String.class);
                if ((email == null || email.isBlank()) && claims.get("user_metadata") instanceof java.util.Map) {
                    java.util.Map<?, ?> meta = (java.util.Map<?, ?>) claims.get("user_metadata");
                    if (meta.get("email") != null) {
                        email = meta.get("email").toString();
                    }
                }
                if (authId != null && !authId.isBlank()) {
                    break;
                }
            } catch (Exception ignored) {
            }
        }

        if (authId != null && !authId.isBlank()) {
            User user = userService.getOrCreateUser(authId, email);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    user,
                    null,
                    Collections.emptyList()
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } else {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Invalid or unverified JWT signature\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private SecretKey[] createCandidateKeys(String secret) {
        SecretKey[] keys = new SecretKey[3];
        if (secret == null || secret.isBlank()) return keys;
        String trimmed = secret.trim();

        try {
            keys[0] = Keys.hmacShaKeyFor(Base64.getDecoder().decode(trimmed));
        } catch (Exception ignored) {}

        try {
            keys[1] = Keys.hmacShaKeyFor(Decoders.BASE64URL.decode(trimmed));
        } catch (Exception ignored) {}

        try {
            keys[2] = Keys.hmacShaKeyFor(trimmed.getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {}

        return keys;
    }
}
