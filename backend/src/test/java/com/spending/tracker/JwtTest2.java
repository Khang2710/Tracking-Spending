package com.spending.tracker;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public class JwtTest2 {
    public static void main(String[] args) {
        String secret = "mpRyH9VlkSSjrdTb56m5Z5mv4yO5p67okVrK7f97cO3nSoj9PCt6wk6ttau2blNBfivGbR+mKIfD9EQUMR/vYw==";
        byte[] bytes = Base64.getDecoder().decode(secret);
        
        System.out.println("hmacShaKeyFor alg: " + Keys.hmacShaKeyFor(bytes).getAlgorithm());
        
        SecretKeySpec keySpec = new SecretKeySpec(bytes, "HmacSHA256");
        System.out.println("SecretKeySpec alg: " + keySpec.getAlgorithm());
        
        try {
            // Can we create a builder?
            System.out.println("OK");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
