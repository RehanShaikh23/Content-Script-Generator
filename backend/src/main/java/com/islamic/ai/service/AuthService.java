package com.islamic.ai.service;

import com.islamic.ai.dto.*;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.security.JwtUtil;
import com.islamic.ai.security.SecurityAuditLogger;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_ACCOUNTS_PER_DEVICE = 2;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final SecurityAuditLogger auditLogger;
    private final EmailService emailService;
    private final HttpServletRequest request;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public AuthResponse signup(SignupRequest signupRequest) {
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            auditLogger.logSignupFailure(signupRequest.getEmail(), "Email already registered", request);
            throw new RuntimeException("Email already registered");
        }

        // ── Device-based account limit ──────────────────────────────
        String deviceIdHash = null;
        String rawDeviceId = signupRequest.getDeviceId();

        if (rawDeviceId != null && !rawDeviceId.isBlank()) {
            deviceIdHash = hashDeviceId(rawDeviceId);
            long existingCount = userRepository.countByDeviceIdHash(deviceIdHash);

            if (existingCount >= MAX_ACCOUNTS_PER_DEVICE) {
                auditLogger.logDeviceLimitReached(signupRequest.getEmail(), deviceIdHash, request);
                throw new RuntimeException(
                        "Account limit reached. You can only create up to 2 accounts on this device.");
            }
        } else {
            // No deviceId provided (old client) — allow but log warning
            auditLogger.logSuspiciousActivity("Signup without deviceId", request);
        }

        User user = User.builder()
                .fullName(signupRequest.getFullName())
                .email(signupRequest.getEmail())
                .password(passwordEncoder.encode(signupRequest.getPassword()))
                .deviceIdHash(deviceIdHash)
                .build();

        userRepository.save(user);

        auditLogger.logSignup(user.getEmail(), request);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getCredits(),
                user.getSubscriptionTier(), user.getSubscriptionStatus());
    }

    public AuthResponse login(LoginRequest loginRequest) {
        User user = userRepository.findByEmail(loginRequest.getEmail())
                .orElse(null);

        if (user == null) {
            auditLogger.logAuthFailure(loginRequest.getEmail(), "User not found", request);
            throw new RuntimeException("Invalid email or password");
        }

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            auditLogger.logAuthFailure(loginRequest.getEmail(), "Invalid password", request);
            throw new RuntimeException("Invalid email or password");
        }

        auditLogger.logAuthSuccess(user.getEmail(), request);

        String token = jwtUtil.generateToken(user.getEmail());
        return new AuthResponse(token, user.getFullName(), user.getEmail(), user.getCredits(),
                user.getSubscriptionTier(), user.getSubscriptionStatus());
    }

    // ── Password Reset ─────────────────────────────────────────────

    /**
     * Request a password reset. Generates a secure token, stores it with
     * a 15-minute expiry, and sends a reset link via email.
     * Always returns silently — never reveals whether the email exists.
     */
    public void forgotPassword(String email) {
        auditLogger.logPasswordResetRequest(email, request);

        Optional<User> optUser = userRepository.findByEmail(email);
        if (optUser.isEmpty()) {
            // Do NOT reveal that the email doesn't exist
            return;
        }

        User user = optUser.get();

        // Generate cryptographically secure 64-char hex token
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String resetToken = HexFormat.of().formatHex(tokenBytes);

        user.setResetToken(resetToken);
        user.setResetTokenExpiry(OffsetDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        userRepository.save(user);

        String resetLink = frontendUrl + "/reset-password?token=" + resetToken;
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
    }

    /**
     * Reset password using a valid, non-expired token.
     * Invalidates the token after successful use.
     */
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset link. Please request a new one."));

        if (user.getResetTokenExpiry() == null || OffsetDateTime.now().isAfter(user.getResetTokenExpiry())) {
            // Token has expired — invalidate it
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            throw new RuntimeException("This reset link has expired. Please request a new one.");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters.");
        }

        // Update password and invalidate token (single-use)
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        auditLogger.logPasswordResetSuccess(user.getEmail(), request);
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /**
     * Hash the raw device ID with SHA-256 so we never store the raw fingerprint.
     */
    private String hashDeviceId(String rawDeviceId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawDeviceId.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
