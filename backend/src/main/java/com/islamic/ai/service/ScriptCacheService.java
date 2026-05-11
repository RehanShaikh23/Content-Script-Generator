package com.islamic.ai.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.islamic.ai.dto.GenerateRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class ScriptCacheService {

    private static final Logger log = LoggerFactory.getLogger(ScriptCacheService.class);

    private final Cache<String, String> scriptCache;

    public ScriptCacheService() {
        this.scriptCache = Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(Duration.ofHours(3))
                .recordStats()
                .build();
        log.info("✦ Script cache initialized — max 500 entries, 3-hour TTL");
    }

    /**
     * Look up a cached script for the given request parameters.
     */
    public Optional<String> getCachedScript(GenerateRequest request, boolean isPremium) {
        String key = buildCacheKey(request, isPremium);
        String cached = scriptCache.getIfPresent(key);
        if (cached != null) {
            log.info("⚡ Cache HIT for topic='{}' (key={})", request.getTopic(), key.substring(0, 12));
            return Optional.of(cached);
        }
        log.debug("Cache MISS for topic='{}'", request.getTopic());
        return Optional.empty();
    }

    /**
     * Store a generated script in the cache.
     */
    public void cacheScript(GenerateRequest request, boolean isPremium, String script) {
        String key = buildCacheKey(request, isPremium);
        scriptCache.put(key, script);
        log.info("📦 Cached script for topic='{}' (key={}, size={}b)",
                request.getTopic(), key.substring(0, 12), script.length());
    }

    /**
     * Build a deterministic cache key by hashing the request parameters.
     * Uses SHA-256 so keys are fixed-length and safe for any input.
     */
    private String buildCacheKey(GenerateRequest request, boolean isPremium) {
        String raw = String.join("|",
                normalize(request.getTopic()),
                normalize(request.getVideoFormat()),
                normalize(request.getCategory()),
                normalize(request.getTone()),
                normalize(request.getCustomTone()),
                normalize(request.getLanguage()),
                String.valueOf(isPremium)
        );

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available in Java, but fallback just in case
            return raw.hashCode() + "_" + raw.length();
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    /**
     * Get cache statistics for monitoring.
     */
    public String getStats() {
        var stats = scriptCache.stats();
        return String.format("hits=%d, misses=%d, hitRate=%.1f%%, size=%d",
                stats.hitCount(), stats.missCount(),
                stats.hitRate() * 100, scriptCache.estimatedSize());
    }
}
