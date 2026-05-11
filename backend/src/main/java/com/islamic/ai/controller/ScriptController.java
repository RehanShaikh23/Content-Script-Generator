package com.islamic.ai.controller;

import com.islamic.ai.dto.GenerateRequest;
import com.islamic.ai.model.ScriptHistory;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.ScriptHistoryRepository;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.ScriptCacheService;
import com.islamic.ai.service.ScriptGenerationService;
import com.islamic.ai.service.StreamingScriptService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/script")
@RequiredArgsConstructor
public class ScriptController {

    private static final Logger log = LoggerFactory.getLogger(ScriptController.class);

    private final ScriptGenerationService scriptGenerationService;
    private final StreamingScriptService streamingScriptService;
    private final ScriptCacheService scriptCacheService;
    private final ScriptHistoryRepository historyRepo;
    private final UserRepository userRepo;

    /**
     * Streaming SSE endpoint — sends script chunks as they arrive from the AI.
     * Events: "chunk" (partial text), "cached" (full cached script), "meta" (credits/premium), "done", "error"
     */
    @PostMapping(value = "/generate/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter generateStream(@RequestBody GenerateRequest request) {
        String email = getAuthenticatedEmail();
        User user = userRepo.findByEmail(email).orElse(null);

        // Auth check — return emitter with error event
        if (user == null) {
            return createErrorEmitter("User not found");
        }

        boolean isPremium = "premium".equalsIgnoreCase(user.getSubscriptionTier())
                && "ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus());

        // Credit check
        if (!isPremium && user.getCredits() <= 0) {
            return createErrorEmitter("No credits remaining. Please upgrade your plan to continue.");
        }

        // Check cache first
        Optional<String> cached = scriptCacheService.getCachedScript(request, isPremium);
        if (cached.isPresent()) {
            log.info("⚡ Serving cached script for topic='{}'", request.getTopic());

            // Deduct credit for non-premium
            if (!isPremium) {
                user.setCredits(user.getCredits() - 1);
                userRepo.save(user);
            }

            // Save to history
            saveHistory(user, request, cached.get());

            // Send cached script as a single chunk + metadata
            SseEmitter emitter = new SseEmitter(30_000L);
            try {
                emitter.send(SseEmitter.event().name("cached").data(cached.get()));
                emitter.send(SseEmitter.event().name("meta").data(
                        Map.of("remainingCredits", user.getCredits(), "isPremium", isPremium, "fromCache", true)
                ));
                emitter.send(SseEmitter.event().name("done").data("complete"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        // Stream from AI
        final User finalUser = user;
        final boolean finalIsPremium = isPremium;

        SseEmitter emitter = streamingScriptService.streamScript(request, isPremium,
                new StreamingScriptService.ScriptStreamCallback() {
                    @Override
                    public void onComplete(String fullScript) {
                        // Deduct credit
                        if (!finalIsPremium) {
                            finalUser.setCredits(finalUser.getCredits() - 1);
                            userRepo.save(finalUser);
                        }

                        // Cache the result
                        scriptCacheService.cacheScript(request, finalIsPremium, fullScript);

                        // Save to history
                        saveHistory(finalUser, request, fullScript);

                        // Send metadata event
                        try {
                            // The emitter might already be completed by the streaming service
                            // so we need to send meta before done in the streaming service
                        } catch (Exception ignored) {}

                        log.info("✅ Stream complete for topic='{}', credits={}",
                                request.getTopic(), finalUser.getCredits());
                    }

                    @Override
                    public void onError(Throwable error) {
                        log.error("Stream generation failed: {}", error.getMessage());
                    }
                });

        // Send metadata as the first event so the frontend knows credits immediately
        try {
            emitter.send(SseEmitter.event().name("meta").data(
                    Map.of("remainingCredits",
                            isPremium ? user.getCredits() : user.getCredits() - 1,
                            "isPremium", isPremium,
                            "fromCache", false)
            ));
        } catch (IOException e) {
            log.error("Failed to send initial meta event: {}", e.getMessage());
        }

        return emitter;
    }

    /**
     * Original non-streaming endpoint (kept for backward compatibility).
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody GenerateRequest request) {
        try {
            String email = getAuthenticatedEmail();
            User user = userRepo.findByEmail(email).orElse(null);

            // Auth check
            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "User not found"));
            }

            // Determine if user has active premium subscription
            boolean isPremium = "premium".equalsIgnoreCase(user.getSubscriptionTier())
                    && "ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus());

            // Credit check — premium users have unlimited access, skip credit deduction
            if (!isPremium && user.getCredits() <= 0) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "No credits remaining. Please upgrade your plan to continue."));
            }

            // Check cache first
            Optional<String> cached = scriptCacheService.getCachedScript(request, isPremium);
            String script;
            if (cached.isPresent()) {
                script = cached.get();
            } else {
                // Generate script — premium users get enhanced parameters
                script = scriptGenerationService.generateScript(request, isPremium);
                // Cache the result
                scriptCacheService.cacheScript(request, isPremium, script);
            }

            // Deduct credit only for non-premium users
            if (!isPremium) {
                user.setCredits(user.getCredits() - 1);
                userRepo.save(user);
            }

            // Save to history
            saveHistory(user, request, script);

            return ResponseEntity.ok(Map.of(
                    "script", script,
                    "remainingCredits", user.getCredits(),
                    "isPremium", isPremium
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/credits")
    public ResponseEntity<?> getCredits() {
        try {
            String email = getAuthenticatedEmail();
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isPremium = "premium".equalsIgnoreCase(user.getSubscriptionTier())
                    && "ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus());

            return ResponseEntity.ok(Map.of(
                    "credits", user.getCredits(),
                    "isPremium", isPremium
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }

    private SseEmitter createErrorEmitter(String errorMessage) {
        SseEmitter emitter = new SseEmitter(5_000L);
        try {
            emitter.send(SseEmitter.event().name("error").data(errorMessage));
            emitter.complete();
        } catch (IOException e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    private void saveHistory(User user, GenerateRequest request, String script) {
        try {
            ScriptHistory history = ScriptHistory.builder()
                    .userId(user.getId())
                    .topic(request.getTopic())
                    .videoFormat(request.getVideoFormat())
                    .category(request.getCategory())
                    .tone(request.getTone())
                    .script(script)
                    .build();
            historyRepo.save(history);
        } catch (Exception ignored) {
            // Don't fail generation if history save fails
        }
    }
}
