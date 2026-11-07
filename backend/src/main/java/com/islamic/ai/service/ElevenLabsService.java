package com.islamic.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.model.VoiceGeneration;
import com.islamic.ai.repository.VoiceGenerationRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Server-side ElevenLabs TTS client.
 *
 * Never exposes the API key to the frontend.
 * Uses the multilingual_v2 model for Arabic/Quranic text support.
 *
 * ElevenLabs pricing: characters are deducted per request.
 * For multilingual_v2 on Creator plan: 1 character = 1 credit equivalent.
 * We use a 1:1 mapping: 1 voice credit = 1 character.
 */
@Service
@RequiredArgsConstructor
public class ElevenLabsService {

    private static final Logger log = LoggerFactory.getLogger(ElevenLabsService.class);

    @Value("${app.elevenlabs.api-key}")
    private String apiKey;

    @Value("${app.elevenlabs.base-url:https://api.elevenlabs.io}")
    private String baseUrl;

    @Value("${app.voice.audio-storage-dir:./voice-audio}")
    private String audioStorageDir;

    @Value("${app.voice.feature-enabled:true}")
    private boolean featureEnabled;

    private final VoiceGenerationRepository generationRepo;
    private final VoiceCreditService creditService;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Approved Voices ──────────────────────────────────────────────

    /** Approved voices for Islamic content narration. */
    private static final Map<String, VoiceInfo> APPROVED_VOICES = Map.of(
        "pNInz6obpgDQGcFmaJgB", new VoiceInfo("pNInz6obpgDQGcFmaJgB", "Adam", "Male", "en", "Deep, authoritative narration"),
        "ErXwobaYiN019PkySvjV", new VoiceInfo("ErXwobaYiN019PkySvjV", "Antoni", "Male", "en", "Warm, engaging storytelling"),
        "VR6AewLTigWG4xSOukaG", new VoiceInfo("VR6AewLTigWG4xSOukaG", "Arnold", "Male", "en", "Strong, clear narration"),
        "EXAVITQu4vr4xnSDxMaL", new VoiceInfo("EXAVITQu4vr4xnSDxMaL", "Bella", "Female", "en", "Gentle, reflective tone"),
        "onwK4e9ZLuTAKqWW03F9", new VoiceInfo("onwK4e9ZLuTAKqWW03F9", "Daniel", "Male", "en", "Calm, scholarly delivery"),
        "jBpfuIE2acCO8z3wKNLl", new VoiceInfo("jBpfuIE2acCO8z3wKNLl", "Gigi", "Female", "en", "Soothing, melodic narration")
    );

    // ── Approved Models ──────────────────────────────────────────────

    private static final Map<String, ModelInfo> APPROVED_MODELS = Map.of(
        "eleven_multilingual_v2", new ModelInfo("eleven_multilingual_v2", "Multilingual v2",
                "Best for Arabic, Urdu, and multilingual Islamic content", 5000, 1.0),
        "eleven_monolingual_v1", new ModelInfo("eleven_monolingual_v1", "English v1",
                "Optimized for English narration", 5000, 1.0)
    );

    private static final String DEFAULT_MODEL = "eleven_multilingual_v2";
    private static final int MAX_CHAR_LIMIT = 5000;
    private static final double SAFETY_MARGIN = 1.1; // 10% buffer on credit estimation

    // ── Public API ───────────────────────────────────────────────────

    public boolean isFeatureEnabled() {
        return featureEnabled;
    }

    public List<Map<String, Object>> getApprovedVoices() {
        List<Map<String, Object>> voices = new ArrayList<>();
        for (VoiceInfo v : APPROVED_VOICES.values()) {
            voices.add(Map.of(
                "voiceId", v.id, "name", v.name, "gender", v.gender,
                "language", v.language, "description", v.description
            ));
        }
        return voices;
    }

    public List<Map<String, Object>> getApprovedModels() {
        List<Map<String, Object>> models = new ArrayList<>();
        for (ModelInfo m : APPROVED_MODELS.values()) {
            models.add(Map.of(
                "modelId", m.id, "name", m.name, "description", m.description,
                "maxChars", m.maxChars, "creditMultiplier", m.creditMultiplier
            ));
        }
        return models;
    }

    /** Estimate credits for a given text and model. */
    public int estimateCredits(String text, String modelId) {
        if (text == null || text.isBlank()) return 0;
        ModelInfo model = APPROVED_MODELS.getOrDefault(modelId, APPROVED_MODELS.get(DEFAULT_MODEL));
        int charCount = text.length();
        // Round to 3 decimal places first to prevent IEEE 754 floating-point precision artifacts
        double unrounded = charCount * model.creditMultiplier() * SAFETY_MARGIN;
        return (int) Math.ceil(Math.round(unrounded * 1000.0) / 1000.0);
    }

    /** Validate voice and model IDs, text length. */
    public String validateRequest(String text, String voiceId, String modelId) {
        if (!featureEnabled) return "Voice generation is currently disabled.";
        if (text == null || text.isBlank()) return "Text is required.";
        if (!APPROVED_VOICES.containsKey(voiceId)) return "Invalid voice selection.";
        ModelInfo model = APPROVED_MODELS.get(modelId);
        if (model == null) return "Invalid model selection.";
        if (text.length() > model.maxChars) {
            return "Text exceeds maximum length of " + model.maxChars + " characters for " + model.name + ".";
        }
        return null; // valid
    }

    /**
     * Generate TTS audio via ElevenLabs API.
     * This is called asynchronously for long scripts.
     *
     * @return the stored generation record with audio path populated
     */
    @Async
    public void generateSpeech(UUID generationId) {
        VoiceGeneration gen = generationRepo.findById(generationId).orElse(null);
        if (gen == null) {
            log.error("❌ Voice generation not found: {}", generationId);
            return;
        }

        try {
            gen.setStatus("PROCESSING");
            generationRepo.save(gen);

            // Build ElevenLabs request
            HttpHeaders headers = new HttpHeaders();
            headers.set("xi-api-key", apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.parseMediaType("audio/mpeg")));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("text", gen.getInputText());
            body.put("model_id", gen.getModelId());
            body.put("voice_settings", Map.of(
                "stability", 0.5,
                "similarity_boost", 0.75,
                "style", 0.0,
                "use_speaker_boost", true
            ));

            String url = baseUrl + "/v1/text-to-speech/" + gen.getVoiceId();

            log.info("🎙️ Calling ElevenLabs TTS: genId={} voiceId={} modelId={} chars={}",
                    generationId, gen.getVoiceId(), gen.getModelId(), gen.getInputCharCount());

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(objectMapper.writeValueAsString(body), headers),
                    byte[].class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                byte[] audioData = response.getBody();

                // Store audio to local filesystem
                Path storagePath = ensureStorageDir();
                String filename = generationId + ".mp3";
                Path audioFile = storagePath.resolve(filename);
                Files.write(audioFile, audioData);

                // Extract actual character usage from response headers if available
                int actualCredits = gen.getInputCharCount(); // ElevenLabs charges per character
                String charCountHeader = response.getHeaders().getFirst("character-count");
                if (charCountHeader != null) {
                    try {
                        actualCredits = Integer.parseInt(charCountHeader);
                    } catch (NumberFormatException ignored) {}
                }

                // Update generation record
                gen.setStatus("COMPLETED");
                gen.setAudioStorageKey(audioFile.toAbsolutePath().toString());
                gen.setAudioSizeBytes((long) audioData.length);
                gen.setActualCredits(actualCredits);
                gen.setCompletedAt(OffsetDateTime.now());
                generationRepo.save(gen);

                // Settle credits: release excess reservation
                creditService.settleGeneration(
                        gen.getUserId(),
                        gen.getReservedCredits(),
                        actualCredits,
                        generationId.toString()
                );

                log.info("✅ Voice generation completed: genId={} size={}KB credits={}",
                        generationId, audioData.length / 1024, actualCredits);

            } else {
                log.warn("❌ ElevenLabs returned non-2xx status: genId={} status={}",
                        generationId, response.getStatusCode());
                handleGenerationFailure(gen, resolveUserFriendlyErrorMessage(null, response.getStatusCode()));
            }

        } catch (Exception e) {
            log.error("❌ Voice generation failed: genId={} error={}", generationId, e.getMessage(), e);
            handleGenerationFailure(gen, resolveUserFriendlyErrorMessage(e, null));
        }
    }

    /** Read audio bytes for an authorized download/stream. */
    public byte[] readAudioFile(String storageKey) throws IOException {
        Path audioFile = Paths.get(storageKey);
        if (!Files.exists(audioFile)) {
            throw new IOException("Audio file not found: " + storageKey);
        }
        return Files.readAllBytes(audioFile);
    }

    // ── Private Helpers ──────────────────────────────────────────────

    private void handleGenerationFailure(VoiceGeneration gen, String userFriendlyMessage) {
        gen.setStatus("FAILED");
        gen.setErrorMessage(userFriendlyMessage != null ? userFriendlyMessage : "Voice narration could not be completed. Your credits have been restored. Please try again later.");
        gen.setCompletedAt(OffsetDateTime.now());
        generationRepo.save(gen);

        // Release reserved credits back to user
        if (gen.getReservedCredits() > 0) {
            creditService.releaseReservation(
                    gen.getUserId(),
                    gen.getReservedCredits(),
                    gen.getId().toString()
            );
        }
    }

    /**
     * Map internal errors, timeouts, and provider statuses to helpful, user-friendly messages
     * related specifically to voice narration without exposing technical exceptions.
     */
    String resolveUserFriendlyErrorMessage(Throwable error, HttpStatusCode statusCode) {
        if (statusCode != null) {
            if (statusCode.value() == 429) {
                return "Voice narration is temporarily busy with high demand. Your credits have been restored. Please try again in a few moments.";
            } else if (statusCode.value() == 400) {
                return "The narration text could not be processed. Your credits have been restored. Please check the text and try again.";
            } else if (statusCode.is5xxServerError()) {
                return "Voice narration provider is currently unavailable. Your credits have been restored. Please try again later.";
            }
        }
        if (error != null) {
            String msg = error.getMessage() != null ? error.getMessage().toLowerCase() : "";
            if (msg.contains("timeout") || msg.contains("timed out")) {
                return "Voice narration request timed out. Your credits have been restored. Please try again in a few moments.";
            }
            if (msg.contains("connect") || msg.contains("refused") || msg.contains("network")) {
                return "Unable to connect to the voice narration service. Your credits have been restored. Please try again later.";
            }
            if (msg.contains("429")) {
                return "Voice narration is temporarily busy. Your credits have been restored. Please try again in a few moments.";
            }
        }
        return "Voice narration could not be completed. Your credits have been restored. Please try again later.";
    }

    private Path ensureStorageDir() throws IOException {
        Path dir = Paths.get(audioStorageDir);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        return dir;
    }

    // ── Inner Classes ────────────────────────────────────────────────

    public record VoiceInfo(String id, String name, String gender, String language, String description) {}
    public record ModelInfo(String id, String name, String description, int maxChars, double creditMultiplier) {}
}
