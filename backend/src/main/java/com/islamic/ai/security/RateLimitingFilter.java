package com.islamic.ai.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitConfig config;
    private final SecurityAuditLogger auditLogger;
    private final UserRepository userRepository;

    // Separate caches per tier so rate limits are independent
    private final Cache<String, Bucket> loginBuckets;
    private final Cache<String, Bucket> signupBuckets;
    private final Cache<String, Bucket> generateBuckets;
    private final Cache<String, Bucket> reportBuckets;
    private final Cache<String, Bucket> forgotPasswordBuckets;
    private final Cache<String, Bucket> generalBuckets;

    public RateLimitingFilter(RateLimitConfig config, SecurityAuditLogger auditLogger,
                              UserRepository userRepository) {
        this.config = config;
        this.auditLogger = auditLogger;
        this.userRepository = userRepository;
        this.loginBuckets          = buildCache(config.getLogin().getMinutes());
        this.signupBuckets         = buildCache(config.getSignup().getMinutes());
        this.generateBuckets       = buildCache(config.getGenerate().getMinutes());
        this.reportBuckets         = buildCache(config.getReport().getMinutes());
        this.forgotPasswordBuckets = buildCache(config.getForgotPassword().getMinutes());
        this.generalBuckets        = buildCache(config.getGeneral().getMinutes());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = resolveClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Bypass rate limiting for premium users
        if (isAuthenticatedPremiumUser()) {
            filterChain.doFilter(request, response);
            return;
        }

        // Determine which tier applies
        TierContext tier = resolveTier(path, method);
        if (tier == null) {
            // No rate-limit rule matches (e.g. OPTIONS preflight) — pass through
            filterChain.doFilter(request, response);
            return;
        }

        String bucketKey = clientIp + ":" + tier.name;
        Bucket bucket = tier.cache.get(bucketKey, k -> createBucket(tier.config));

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        // Always send the remaining-tokens header
        response.setHeader("X-Rate-Limit-Remaining",
                String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
        } else {
            long retryAfterSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            if (retryAfterSeconds == 0) retryAfterSeconds = 1;

            // Log the rate limit event
            auditLogger.logRateLimitHit(tier.name, request);

            response.setStatus(429);
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
            response.getWriter().write(
                    "{\"error\":\"Too many requests. Please try again later.\","
                  + "\"retryAfterSeconds\":" + retryAfterSeconds + "}"
            );
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────

    /**
     * Check if the current request is from an authenticated premium user.
     * Premium users bypass all rate limits.
     */
    private boolean isAuthenticatedPremiumUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || !auth.isAuthenticated()) {
            return false;
        }

        // Avoid DB lookup for anonymous/unauthenticated principals
        String principal = auth.getName();
        if ("anonymousUser".equals(principal)) {
            return false;
        }

        try {
            Optional<User> optUser = userRepository.findByEmail(principal);
            if (optUser.isEmpty()) return false;

            User user = optUser.get();
            return "premium".equalsIgnoreCase(user.getSubscriptionTier())
                    && ("ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus())
                        || "CANCELLATION_SCHEDULED".equalsIgnoreCase(user.getSubscriptionStatus()));
        } catch (Exception e) {
            // If DB lookup fails, don't bypass rate limiting
            return false;
        }
    }

    private TierContext resolveTier(String path, String method) {
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return null; // never rate-limit CORS preflight
        }
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/auth/login")) {
            return new TierContext("login", loginBuckets, config.getLogin());
        }
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/auth/signup")) {
            return new TierContext("signup", signupBuckets, config.getSignup());
        }
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/auth/forgot-password")) {
            return new TierContext("forgot-password", forgotPasswordBuckets, config.getForgotPassword());
        }
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/script/generate")) {
            return new TierContext("generate", generateBuckets, config.getGenerate());
        }
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/report")) {
            return new TierContext("report", reportBuckets, config.getReport());
        }
        if (path.startsWith("/api/")) {
            return new TierContext("general", generalBuckets, config.getGeneral());
        }
        return null; // non-API paths (static assets, etc.)
    }

    private Bucket createBucket(RateLimitConfig.Tier tier) {
        Bandwidth bandwidth = Bandwidth.builder()
                .capacity(tier.getCapacity())
                .refillGreedy(tier.getCapacity(), Duration.ofMinutes(tier.getMinutes()))
                .build();
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private Cache<String, Bucket> buildCache(int expiryMinutes) {
        return Caffeine.newBuilder()
                .expireAfterAccess(expiryMinutes + 1, TimeUnit.MINUTES)
                .maximumSize(100_000)
                .build();
    }

    /**
     * Extracts the real client IP, respecting X-Forwarded-For when behind
     * a reverse proxy (Nginx, Cloudflare, AWS ALB, etc.).
     */
    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2 — take the first
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /** Simple holder to pass tier metadata around. */
    private record TierContext(String name, Cache<String, Bucket> cache, RateLimitConfig.Tier config) {}
}
