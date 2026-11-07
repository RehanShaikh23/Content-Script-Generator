package com.islamic.ai.controller;

import com.islamic.ai.model.User;
import com.islamic.ai.model.VoiceGeneration;
import com.islamic.ai.repository.ScriptHistoryRepository;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.repository.VoiceGenerationRepository;
import com.islamic.ai.service.DodoPaymentsService;
import com.islamic.ai.service.ElevenLabsService;
import com.islamic.ai.service.VoiceCreditService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;

/**
 * REST endpoints for the ElevenLabs voice generation add-on.
 *
 * All endpoints require JWT authentication.
 * Audio files are served only to the owning user.
 */
@RestController
@RequestMapping("/api/voice")
@RequiredArgsConstructor
public class VoiceController {

    private static final Logger log = LoggerFactory.getLogger(VoiceController.class);

    private final VoiceCreditService creditService;
    private final ElevenLabsService elevenLabsService;
    private final VoiceGenerationRepository generationRepo;
    private final UserRepository userRepository;
    private final ScriptHistoryRepository scriptHistoryRepo;
    private final DodoPaymentsService dodoPaymentsService;

    // ── Credit Balance & Entitlement ─────────────────────────────────

    /**
     * GET /api/voice/balance
     * Returns the user's voice credit balance and entitlement info.
     */
    @GetMapping("/balance")
    public ResponseEntity<?> getBalance() {
        User user = getAuthenticatedUser();
        int balance = creditService.getBalance(user.getId());

        return ResponseEntity.ok(Map.of(
                "balance", balance,
                "hasVoicePack", balance > 0,
                "featureEnabled", elevenLabsService.isFeatureEnabled()
        ));
    }

    // ── Checkout ─────────────────────────────────────────────────────

    /**
     * POST /api/voice/checkout
     * Creates a Dodo Payments checkout session for the ₹800 voice pack.
     * Returns { checkoutUrl: "..." }
     */
    @PostMapping("/checkout")
    public ResponseEntity<?> createVoicePackCheckout() {
        User user = getAuthenticatedUser();

        if (!elevenLabsService.isFeatureEnabled()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Voice generation is currently disabled."
            ));
        }

        try {
            String checkoutUrl = dodoPaymentsService.createVoicePackCheckout(
                    user.getEmail(), user.getFullName()
            );

            log.info("✅ Voice pack checkout created: user={}", user.getEmail());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "checkoutUrl", checkoutUrl
            ));
        } catch (Exception e) {
            log.error("❌ Failed to create voice pack checkout for user={}: {}",
                    user.getEmail(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Unable to start voice pack checkout right now. Please try again later."
            ));
        }
    }

    // ── Voice & Model Selection ──────────────────────────────────────

    /**
     * GET /api/voice/voices
     * Returns the list of approved voices.
     */
    @GetMapping("/voices")
    public ResponseEntity<?> getVoices() {
        return ResponseEntity.ok(Map.of(
                "voices", elevenLabsService.getApprovedVoices()
        ));
    }

    /**
     * GET /api/voice/models
     * Returns the list of approved TTS models.
     */
    @GetMapping("/models")
    public ResponseEntity<?> getModels() {
        return ResponseEntity.ok(Map.of(
                "models", elevenLabsService.getApprovedModels()
        ));
    }

    // ── Credit Estimation ────────────────────────────────────────────

    /**
     * POST /api/voice/estimate
     * Estimate credits needed for a given text.
     * Body: { "text": "...", "modelId": "..." }
     */
    @PostMapping("/estimate")
    public ResponseEntity<?> estimateCredits(@RequestBody Map<String, String> body) {
        String text = body.getOrDefault("text", "");
        String modelId = body.getOrDefault("modelId", "eleven_multilingual_v2");

        int estimated = elevenLabsService.estimateCredits(text, modelId);
        int balance = creditService.getBalance(getAuthenticatedUser().getId());

        return ResponseEntity.ok(Map.of(
                "estimatedCredits", estimated,
                "currentBalance", balance,
                "sufficient", balance >= estimated
        ));
    }

    // ── Generation ───────────────────────────────────────────────────

    /**
     * POST /api/voice/generate
     * Queue a voice generation job.
     * Body: { "text": "...", "voiceId": "...", "modelId": "...", "scriptHistoryId": "..." (optional) }
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateVoice(@RequestBody Map<String, String> body) {
        User user = getAuthenticatedUser();

        String text = body.getOrDefault("text", "");
        String voiceId = body.getOrDefault("voiceId", "");
        String modelId = body.getOrDefault("modelId", "eleven_multilingual_v2");
        String scriptHistoryId = body.get("scriptHistoryId");

        // 1. Validate feature flag
        if (!elevenLabsService.isFeatureEnabled()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Voice generation is currently disabled."
            ));
        }

        // 2. Validate request
        String validationError = elevenLabsService.validateRequest(text, voiceId, modelId);
        if (validationError != null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", validationError
            ));
        }

        try {
            // 3. Validate script ownership if scriptHistoryId provided
            UUID scriptId = null;
            if (scriptHistoryId != null && !scriptHistoryId.isBlank()) {
                try {
                    scriptId = UUID.fromString(scriptHistoryId);
                    boolean ownsScript = scriptHistoryRepo.findById(scriptId)
                            .map(sh -> sh.getUserId().equals(user.getId()))
                            .orElse(false);
                    if (!ownsScript) {
                        return ResponseEntity.status(403).body(Map.of(
                                "success", false,
                                "error", "You do not own this script."
                        ));
                    }
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of(
                            "success", false,
                            "error", "Invalid script ID."
                    ));
                }
            }

            // 4. Estimate credits and reserve
            int estimatedCredits = elevenLabsService.estimateCredits(text, modelId);
            String idempotencyKey = "gen:" + user.getId() + ":" + System.currentTimeMillis();

            // Check for duplicate using idempotency key from client if provided
            String clientIdempotencyKey = body.get("idempotencyKey");
            if (clientIdempotencyKey != null && !clientIdempotencyKey.isBlank()) {
                idempotencyKey = clientIdempotencyKey;
                if (generationRepo.existsByIdempotencyKey(idempotencyKey)) {
                    VoiceGeneration existing = generationRepo.findByIdempotencyKey(idempotencyKey).orElse(null);
                    if (existing != null) {
                        return ResponseEntity.ok(Map.of(
                                "success", true,
                                "generationId", existing.getId().toString(),
                                "status", existing.getStatus(),
                                "message", "Generation already in progress."
                        ));
                    }
                }
            }

            // 5. Create generation record
            VoiceGeneration generation = VoiceGeneration.builder()
                    .userId(user.getId())
                    .scriptHistoryId(scriptId)
                    .voiceId(voiceId)
                    .modelId(modelId)
                    .inputText(text)
                    .inputCharCount(text.length())
                    .estimatedCredits(estimatedCredits)
                    .idempotencyKey(idempotencyKey)
                    .status("PENDING")
                    .build();
            generationRepo.save(generation);

            // 6. Reserve credits atomically
            int reserved = creditService.reserveCredits(
                    user.getId(), estimatedCredits, generation.getId().toString()
            );

            if (reserved < 0) {
                generation.setStatus("FAILED");
                generation.setErrorMessage("Insufficient voice credits. You have " + creditService.getBalance(user.getId()) +
                        " credits but need " + estimatedCredits + ".");
                generationRepo.save(generation);

                int balance = creditService.getBalance(user.getId());
                return ResponseEntity.status(402).body(Map.of(
                        "success", false,
                        "error", "Insufficient voice credits. You have " + balance +
                                " credits but need " + estimatedCredits + ".",
                        "balance", balance,
                        "required", estimatedCredits
                ));
            }

            // 7. Update generation with reserved amount
            generation.setReservedCredits(reserved);
            generation.setStatus("PENDING");
            generationRepo.save(generation);

            // 8. Queue async generation
            elevenLabsService.generateSpeech(generation.getId());

            log.info("🎙️ Voice generation queued: genId={} user={} credits={}",
                    generation.getId(), user.getEmail(), reserved);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "generationId", generation.getId().toString(),
                    "status", "PENDING",
                    "estimatedCredits", estimatedCredits,
                    "message", "Voice generation started."
            ));
        } catch (Exception e) {
            log.error("❌ Failed to initiate voice generation for user={}: {}", user.getEmail(), e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Unable to start voice narration right now. Please try again later."
            ));
        }
    }

    // ── Generation Status ────────────────────────────────────────────

    /**
     * GET /api/voice/generation/{id}
     * Get the status of a specific generation job.
     */
    @GetMapping("/generation/{id}")
    public ResponseEntity<?> getGenerationStatus(@PathVariable String id) {
        User user = getAuthenticatedUser();
        UUID genId;
        try {
            genId = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid generation ID."));
        }

        Optional<VoiceGeneration> opt = generationRepo.findByIdAndUserId(genId, user.getId());
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        VoiceGeneration gen = opt.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("generationId", gen.getId().toString());
        response.put("status", gen.getStatus());
        response.put("voiceId", gen.getVoiceId());
        response.put("modelId", gen.getModelId());
        response.put("inputCharCount", gen.getInputCharCount());
        response.put("estimatedCredits", gen.getEstimatedCredits());
        response.put("actualCredits", gen.getActualCredits());
        response.put("reservedCredits", gen.getReservedCredits());
        response.put("createdAt", gen.getCreatedAt() != null ? gen.getCreatedAt().toString() : null);
        response.put("completedAt", gen.getCompletedAt() != null ? gen.getCompletedAt().toString() : null);

        if ("COMPLETED".equals(gen.getStatus())) {
            response.put("audioAvailable", true);
            response.put("audioSizeBytes", gen.getAudioSizeBytes());
            response.put("audioDurationMs", gen.getAudioDurationMs());
        } else if ("FAILED".equals(gen.getStatus())) {
            response.put("error", sanitizeVoiceError(gen.getErrorMessage()));
        }

        return ResponseEntity.ok(response);
    }

    // ── Generation History ───────────────────────────────────────────

    /**
     * GET /api/voice/history
     * Returns the user's voice generation history.
     */
    @GetMapping("/history")
    public ResponseEntity<?> getHistory() {
        User user = getAuthenticatedUser();
        List<VoiceGeneration> generations = generationRepo.findByUserIdOrderByCreatedAtDesc(user.getId());

        List<Map<String, Object>> history = new ArrayList<>();
        for (VoiceGeneration gen : generations) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("generationId", gen.getId().toString());
            entry.put("status", gen.getStatus());
            entry.put("voiceId", gen.getVoiceId());
            entry.put("modelId", gen.getModelId());
            entry.put("inputCharCount", gen.getInputCharCount());
            entry.put("estimatedCredits", gen.getEstimatedCredits());
            entry.put("actualCredits", gen.getActualCredits());
            entry.put("createdAt", gen.getCreatedAt() != null ? gen.getCreatedAt().toString() : null);
            entry.put("completedAt", gen.getCompletedAt() != null ? gen.getCompletedAt().toString() : null);
            entry.put("audioAvailable", "COMPLETED".equals(gen.getStatus()));

            // Include a preview of the text (first 100 chars)
            String preview = gen.getInputText();
            if (preview != null && preview.length() > 100) {
                preview = preview.substring(0, 100) + "...";
            }
            entry.put("textPreview", preview);

            if ("FAILED".equals(gen.getStatus())) {
                entry.put("error", sanitizeVoiceError(gen.getErrorMessage()));
            }

            history.add(entry);
        }

        return ResponseEntity.ok(Map.of(
                "generations", history,
                "total", history.size()
        ));
    }

    // ── Audio Streaming / Download ───────────────────────────────────

    /**
     * GET /api/voice/audio/{id}
     * Stream or download the generated audio file.
     * Only the owning user can access their audio.
     */
    @GetMapping("/audio/{id}")
    public ResponseEntity<?> getAudio(@PathVariable String id) {
        User user = getAuthenticatedUser();
        UUID genId;
        try {
            genId = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid generation ID."));
        }

        Optional<VoiceGeneration> opt = generationRepo.findByIdAndUserId(genId, user.getId());
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        VoiceGeneration gen = opt.get();
        if (!"COMPLETED".equals(gen.getStatus()) || gen.getAudioStorageKey() == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "Voice narration audio is not ready yet. Please wait a moment and try again."
            ));
        }

        try {
            byte[] audioData = elevenLabsService.readAudioFile(gen.getAudioStorageKey());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(
                    gen.getAudioContentType() != null ? gen.getAudioContentType() : "audio/mpeg"
            ));
            headers.setContentLength(audioData.length);
            headers.set("Content-Disposition", "inline; filename=\"voice-" + id + ".mp3\"");
            headers.setCacheControl(CacheControl.noCache());

            return new ResponseEntity<>(audioData, headers, HttpStatus.OK);
        } catch (IOException e) {
            log.error("❌ Failed to read audio file: genId={} error={}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Unable to stream audio narration right now. Please try again later."
            ));
        }
    }

    /**
     * GET /api/voice/audio/{id}/download
     * Force download the audio file as attachment.
     */
    @GetMapping("/audio/{id}/download")
    public ResponseEntity<?> downloadAudio(@PathVariable String id) {
        User user = getAuthenticatedUser();
        UUID genId;
        try {
            genId = UUID.fromString(id);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid generation ID."));
        }

        Optional<VoiceGeneration> opt = generationRepo.findByIdAndUserId(genId, user.getId());
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        VoiceGeneration gen = opt.get();
        if (!"COMPLETED".equals(gen.getStatus()) || gen.getAudioStorageKey() == null) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "Voice narration audio is not ready for download. Please wait a moment and try again."
            ));
        }

        try {
            byte[] audioData = elevenLabsService.readAudioFile(gen.getAudioStorageKey());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("audio/mpeg"));
            headers.setContentLength(audioData.length);
            headers.set("Content-Disposition", "attachment; filename=\"islamic-voice-" + id + ".mp3\"");

            return new ResponseEntity<>(audioData, headers, HttpStatus.OK);
        } catch (IOException e) {
            log.error("❌ Failed to download audio: genId={} error={}", id, e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Unable to download audio file right now. Please try again later."
            ));
        }
    }

    // ── Helper ───────────────────────────────────────────────────────

    private String sanitizeVoiceError(String error) {
        if (error == null || error.isBlank()) {
            return "Voice narration could not be completed. Your credits have been restored. Please try again later.";
        }
        String lower = error.toLowerCase();
        if (lower.contains("exception") || lower.contains("http") || lower.contains("error:")
                || lower.contains("status code") || lower.contains("connect") || lower.contains("failed to")) {
            return "Voice narration could not be completed. Your credits have been restored. Please try again later.";
        }
        return error;
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }
}

