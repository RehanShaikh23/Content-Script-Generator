package com.islamic.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String fullName;
    private String email;
    private int credits;
    private String subscriptionTier;
    private String subscriptionStatus;
}
