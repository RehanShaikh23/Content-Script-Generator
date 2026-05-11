package com.islamic.ai.security;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Centralized security audit logger.
 * All security-relevant events are logged here with a structured format
 * for easy parsing by log aggregation tools (ELK, CloudWatch, etc.).
 *
 * Log format: SECURITY_AUDIT | EVENT_TYPE | ip=... | email=... | detail=...
 */
@Component
public class SecurityAuditLogger {

    private static final Logger log = LoggerFactory.getLogger("SECURITY_AUDIT");

    // ── Authentication Events ───────────────────────────────────────

    public void logAuthSuccess(String email, HttpServletRequest request) {
        log.info("AUTH_SUCCESS | ip={} | email={} | ua={}",
                resolveIp(request), email, getUserAgent(request));
    }

    public void logAuthFailure(String email, String reason, HttpServletRequest request) {
        log.warn("AUTH_FAILURE | ip={} | email={} | reason={} | ua={}",
                resolveIp(request), email, reason, getUserAgent(request));
    }

    public void logSignup(String email, HttpServletRequest request) {
        log.info("SIGNUP | ip={} | email={} | ua={}",
                resolveIp(request), email, getUserAgent(request));
    }

    public void logSignupFailure(String email, String reason, HttpServletRequest request) {
        log.warn("SIGNUP_FAILURE | ip={} | email={} | reason={} | ua={}",
                resolveIp(request), email, reason, getUserAgent(request));
    }

    public void logDeviceLimitReached(String email, String deviceIdHash, HttpServletRequest request) {
        log.warn("DEVICE_LIMIT | ip={} | email={} | deviceHash={} | ua={}",
                resolveIp(request), email, deviceIdHash, getUserAgent(request));
    }

    // ── Password Reset Events ───────────────────────────────────────

    public void logPasswordResetRequest(String email, HttpServletRequest request) {
        log.info("PASSWORD_RESET_REQUEST | ip={} | email={} | ua={}",
                resolveIp(request), email, getUserAgent(request));
    }

    public void logPasswordResetSuccess(String email, HttpServletRequest request) {
        log.info("PASSWORD_RESET_SUCCESS | ip={} | email={} | ua={}",
                resolveIp(request), email, getUserAgent(request));
    }

    // ── JWT Events ──────────────────────────────────────────────────

    public void logJwtValidationFailure(String reason, HttpServletRequest request) {
        log.warn("JWT_INVALID | ip={} | reason={} | path={} | ua={}",
                resolveIp(request), reason, request.getRequestURI(), getUserAgent(request));
    }

    // ── Rate Limiting Events ────────────────────────────────────────

    public void logRateLimitHit(String tier, HttpServletRequest request) {
        log.warn("RATE_LIMIT | ip={} | tier={} | path={} | ua={}",
                resolveIp(request), tier, request.getRequestURI(), getUserAgent(request));
    }

    // ── API Error Events ────────────────────────────────────────────

    public void logApiError(int statusCode, String method, String path, HttpServletRequest request) {
        String level = statusCode >= 500 ? "ERROR" : "WARN";
        if (statusCode >= 500) {
            log.error("API_ERROR | status={} | method={} | path={} | ip={} | ua={}",
                    statusCode, method, path, resolveIp(request), getUserAgent(request));
        } else {
            log.warn("API_ERROR | status={} | method={} | path={} | ip={} | ua={}",
                    statusCode, method, path, resolveIp(request), getUserAgent(request));
        }
    }

    // ── Subscription Events ──────────────────────────────────────────

    public void logSubscriptionCancellation(String email, String reason, HttpServletRequest request) {
        log.info("SUBSCRIPTION_CANCEL | ip={} | email={} | reason={} | ua={}",
                resolveIp(request), email,
                reason != null && !reason.isBlank() ? reason : "none",
                getUserAgent(request));
    }

    public void logSubscriptionReactivation(String email, HttpServletRequest request) {
        log.info("SUBSCRIPTION_REACTIVATE | ip={} | email={} | ua={}",
                resolveIp(request), email, getUserAgent(request));
    }

    // ── Suspicious Activity ─────────────────────────────────────────

    public void logSuspiciousActivity(String description, HttpServletRequest request) {
        log.warn("SUSPICIOUS | ip={} | detail={} | path={} | ua={}",
                resolveIp(request), description, request.getRequestURI(), getUserAgent(request));
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private String resolveIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getUserAgent(HttpServletRequest request) {
        String ua = request.getHeader("User-Agent");
        return ua != null ? ua.substring(0, Math.min(ua.length(), 100)) : "unknown";
    }
}
