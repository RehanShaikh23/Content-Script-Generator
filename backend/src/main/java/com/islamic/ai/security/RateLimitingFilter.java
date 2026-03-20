package com.islamic.ai.security;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitConfig config;

    // Separate caches per tier so rate limits are independent
    private final Cache<String, Bucket> loginBuckets;
    private final Cache<String, Bucket> signupBuckets;
    private final Cache<String, Bucket> generateBuckets;
    private final Cache<String, Bucket> generalBuckets;

    public RateLimitingFilter(RateLimitConfig config) {
        this.config = config;
        this.loginBuckets    = buildCache(config.getLogin().getMinutes());
        this.signupBuckets   = buildCache(config.getSignup().getMinutes());
        this.generateBuckets = buildCache(config.getGenerate().getMinutes());
        this.generalBuckets  = buildCache(config.getGeneral().getMinutes());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = resolveClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

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
        if ("POST".equalsIgnoreCase(method) && path.equals("/api/script/generate")) {
            return new TierContext("generate", generateBuckets, config.getGenerate());
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
