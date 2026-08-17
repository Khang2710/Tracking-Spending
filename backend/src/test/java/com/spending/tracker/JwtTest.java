package com.spending.tracker;

import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.io.Decoders;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

public class JwtTest {
    public static void main(String[] args) {
        String secret = "mpRyH9VlkSSjrdTb56m5Z5mv4yO5p67okVrK7f97cO3nSoj9PCt6wk6ttau2blNBfivGbR+mKIfD9EQUMR/vYw==";
        try {
            System.out.println("1: " + Keys.hmacShaKeyFor(Base64.getDecoder().decode(secret)).getAlgorithm());
        } catch (Exception e) { System.out.println("1 failed: " + e.getMessage()); }
        try {
            System.out.println("2: " + Keys.hmacShaKeyFor(Decoders.BASE64URL.decode(secret)).getAlgorithm());
        } catch (Exception e) { System.out.println("2 failed: " + e.getMessage()); }
        try {
            System.out.println("3: " + Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)).getAlgorithm());
        } catch (Exception e) { System.out.println("3 failed: " + e.getMessage()); }
    }
}
