package com.islamic.ai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure JUnit 5 unit tests for ElevenLabsService (validation, estimation, voice/model listing).
 * Runs without byte-buddy agent attachment for maximum sandbox and CI compatibility.
 */
class ElevenLabsServiceTest {

    private ElevenLabsService elevenLabsService;

    @BeforeEach
    void setUp() throws Exception {
        elevenLabsService = new ElevenLabsService(null, null);
        setField("apiKey", "test-api-key");
        setField("baseUrl", "https://api.elevenlabs.io");
        setField("audioStorageDir", "./test-voice-audio");
        setField("featureEnabled", true);
    }

    private void setField(String name, Object value) throws Exception {
        Field field = ElevenLabsService.class.getDeclaredField(name);
        field.setAccessible(true);
        field.set(elevenLabsService, value);
    }

    // ── Feature Flag ────────────────────────────────────────────────

    @Test
    void isFeatureEnabled_returnsTrue_whenEnabled() {
        assertTrue(elevenLabsService.isFeatureEnabled());
    }

    @Test
    void isFeatureEnabled_returnsFalse_whenDisabled() throws Exception {
        setField("featureEnabled", false);
        assertFalse(elevenLabsService.isFeatureEnabled());
    }

    // ── Validation ──────────────────────────────────────────────────

    @Test
    void validateRequest_rejectsWhenFeatureDisabled() throws Exception {
        setField("featureEnabled", false);
        String error = elevenLabsService.validateRequest("Hello", "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNotNull(error);
        assertEquals("Voice generation is currently disabled.", error);
    }

    @Test
    void validateRequest_rejectsBlankText() {
        String error = elevenLabsService.validateRequest("", "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNotNull(error);
        assertEquals("Text is required.", error);
    }

    @Test
    void validateRequest_rejectsNullText() {
        String error = elevenLabsService.validateRequest(null, "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNotNull(error);
        assertEquals("Text is required.", error);
    }

    @Test
    void validateRequest_rejectsInvalidVoiceId() {
        String error = elevenLabsService.validateRequest("Hello", "invalid-voice-id", "eleven_multilingual_v2");
        assertNotNull(error);
        assertEquals("Invalid voice selection.", error);
    }

    @Test
    void validateRequest_rejectsInvalidModelId() {
        String error = elevenLabsService.validateRequest("Hello", "pNInz6obpgDQGcFmaJgB", "invalid-model-id");
        assertNotNull(error);
        assertEquals("Invalid model selection.", error);
    }

    @Test
    void validateRequest_rejectsOversizedText() {
        String longText = "A".repeat(5001); // exceeds 5000 char limit
        String error = elevenLabsService.validateRequest(longText, "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNotNull(error);
        assertTrue(error.contains("exceeds maximum length"));
    }

    @Test
    void validateRequest_acceptsExactMaxLength() {
        String maxText = "A".repeat(5000); // exactly at limit
        String error = elevenLabsService.validateRequest(maxText, "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNull(error, "Exactly max length should be accepted");
    }

    @Test
    void validateRequest_acceptsValidRequest() {
        String error = elevenLabsService.validateRequest(
                "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْم",
                "pNInz6obpgDQGcFmaJgB",
                "eleven_multilingual_v2"
        );
        assertNull(error, "Valid Arabic text should be accepted");
    }

    @Test
    void validateRequest_acceptsAllApprovedVoices() {
        String[] voiceIds = {
                "pNInz6obpgDQGcFmaJgB",  // Adam
                "ErXwobaYiN019PkySvjV",  // Antoni
                "VR6AewLTigWG4xSOukaG",  // Arnold
                "EXAVITQu4vr4xnSDxMaL",  // Bella
                "onwK4e9ZLuTAKqWW03F9",  // Daniel
                "jBpfuIE2acCO8z3wKNLl"   // Gigi
        };
        for (String voiceId : voiceIds) {
            String error = elevenLabsService.validateRequest("Test", voiceId, "eleven_multilingual_v2");
            assertNull(error, "Voice " + voiceId + " should be accepted");
        }
    }

    @Test
    void validateRequest_acceptsBothApprovedModels() {
        String error1 = elevenLabsService.validateRequest("Test", "pNInz6obpgDQGcFmaJgB", "eleven_multilingual_v2");
        assertNull(error1);

        String error2 = elevenLabsService.validateRequest("Test", "pNInz6obpgDQGcFmaJgB", "eleven_monolingual_v1");
        assertNull(error2);
    }

    // ── Credit Estimation ───────────────────────────────────────────

    @Test
    void estimateCredits_returnsZeroForBlankText() {
        assertEquals(0, elevenLabsService.estimateCredits("", "eleven_multilingual_v2"));
        assertEquals(0, elevenLabsService.estimateCredits(null, "eleven_multilingual_v2"));
        assertEquals(0, elevenLabsService.estimateCredits("   ", "eleven_multilingual_v2"));
    }

    @Test
    void estimateCredits_appliesSafetyMargin() {
        int estimate = elevenLabsService.estimateCredits("A".repeat(100), "eleven_multilingual_v2");
        assertEquals(110, estimate, "100 chars should estimate to 110 with 1.1x safety margin");
    }

    @Test
    void estimateCredits_ceilsToInteger() {
        int estimate = elevenLabsService.estimateCredits("A", "eleven_multilingual_v2");
        assertEquals(2, estimate, "Should ceil 1.1 to 2");
    }

    @Test
    void estimateCredits_handlesArabicText() {
        String arabic = "بِسْمِ اللهِ";
        int estimate = elevenLabsService.estimateCredits(arabic, "eleven_multilingual_v2");
        int expected = (int) Math.ceil(arabic.length() * 1.0 * 1.1);
        assertEquals(expected, estimate);
    }

    @Test
    void estimateCredits_fallsBackToDefaultModelForUnknown() {
        int estimate = elevenLabsService.estimateCredits("A".repeat(100), "unknown_model");
        assertEquals(110, estimate, "Should use default model for unknown model ID");
    }

    @Test
    void estimateCredits_maxLength5000() {
        int estimate = elevenLabsService.estimateCredits("A".repeat(5000), "eleven_multilingual_v2");
        assertEquals(5500, estimate);
    }

    // ── Voice & Model Listing ───────────────────────────────────────

    @Test
    void getApprovedVoices_returns6Voices() {
        List<Map<String, Object>> voices = elevenLabsService.getApprovedVoices();
        assertEquals(6, voices.size(), "Should have exactly 6 approved voices");
    }

    @Test
    void getApprovedVoices_containsRequiredFields() {
        List<Map<String, Object>> voices = elevenLabsService.getApprovedVoices();
        for (Map<String, Object> voice : voices) {
            assertTrue(voice.containsKey("voiceId"), "Voice should have voiceId");
            assertTrue(voice.containsKey("name"), "Voice should have name");
            assertTrue(voice.containsKey("gender"), "Voice should have gender");
            assertTrue(voice.containsKey("language"), "Voice should have language");
            assertTrue(voice.containsKey("description"), "Voice should have description");
        }
    }

    @Test
    void getApprovedModels_returns2Models() {
        List<Map<String, Object>> models = elevenLabsService.getApprovedModels();
        assertEquals(2, models.size(), "Should have exactly 2 approved models");
    }

    @Test
    void getApprovedModels_containsRequiredFields() {
        List<Map<String, Object>> models = elevenLabsService.getApprovedModels();
        for (Map<String, Object> model : models) {
            assertTrue(model.containsKey("modelId"), "Model should have modelId");
            assertTrue(model.containsKey("name"), "Model should have name");
            assertTrue(model.containsKey("description"), "Model should have description");
            assertTrue(model.containsKey("maxChars"), "Model should have maxChars");
            assertTrue(model.containsKey("creditMultiplier"), "Model should have creditMultiplier");
        }
    }

    @Test
    void getApprovedModels_multilingualV2HasCorrectMaxChars() {
        List<Map<String, Object>> models = elevenLabsService.getApprovedModels();
        boolean found = false;
        for (Map<String, Object> model : models) {
            if ("eleven_multilingual_v2".equals(model.get("modelId"))) {
                assertEquals(5000, model.get("maxChars"));
                assertEquals(1.0, model.get("creditMultiplier"));
                found = true;
            }
        }
        assertTrue(found, "eleven_multilingual_v2 should be in approved models");
    }
}
