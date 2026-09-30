package com.islamic.ai.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AiModelConfigTest {
    @Test
    void sharedDefaultUsesOpenRouterAndAllowsEnvironmentOverride() throws Exception {
        var properties = new java.util.Properties();
        try (var input = getClass().getResourceAsStream("/application.properties")) {
            assertNotNull(input);
            properties.load(input);
        }
        assertEquals("${OPENROUTER_DEFAULT_MODEL:deepseek/deepseek-chat}",
                properties.getProperty("app.ai.openrouter-default-model"));
        assertNull(properties.getProperty("app.ai.api-key"));
        assertNull(properties.getProperty("app.ai.base-url"));
        assertNull(properties.getProperty("app.ai.model"));
    }

    private final AiModelConfig config = new AiModelConfig(
            "deepseek/deepseek-chat",
            "test-openrouter", "https://router.example/chat");

    @Test
    void legacySelectionsResolveToSupportedReplacements() {
        assertEquals("google/gemma-4-26b-a4b-it:free",
                config.resolve("google/gemma-2-9b-it:free", false).modelString());
        assertEquals("anthropic/claude-sonnet-4.6",
                config.resolve("anthropic/claude-3.5-sonnet", true).modelString());
        assertEquals("google/gemini-2.5-flash",
                config.resolve("google/gemini-2.0-flash-001", true).modelString());
        assertEquals("mistralai/mistral-large",
                config.resolve("mistralai/mistral-large-latest", true).modelString());
    }

    @Test
    void replacementsPreservePremiumGate() {
        assertEquals("deepseek/deepseek-chat",
                config.resolve("anthropic/claude-3.5-sonnet", false).modelString());
        assertEquals("deepseek/deepseek-chat",
                config.resolve("anthropic/claude-sonnet-4.6", false).modelString());
        assertEquals(3, config.getAvailableModels(false).size());
        assertEquals(7, config.getAvailableModels(true).size());
    }

    @Test
    void existingWorkingModelsRemainUnchanged() {
        assertEquals("deepseek/deepseek-chat", config.resolve("deepseek/deepseek-chat", false).modelString());
        assertEquals("openai/gpt-4o", config.resolve("openai/gpt-4o", true).modelString());
        assertEquals("deepseek/deepseek-chat", config.resolve("default", false).modelString());
    }

    @Test
    void allSelectionsAndFallbacksUseOnlyOpenRouterCredentials() {
        for (var entry : config.getAvailableModels(true)) {
            var resolved = config.resolve(entry.id(), true);
            assertEquals(AiModelConfig.Provider.OPENROUTER, resolved.provider());
            assertEquals("https://router.example/chat", resolved.baseUrl());
            assertEquals("test-openrouter", resolved.apiKey());
        }
        for (String selection : new String[]{null, "", "default", "unknown-model"}) {
            assertEquals(config.resolve("default", false), config.resolve(selection, false));
        }
    }

    @Test
    void missingKeyFailsWithoutAnAlternateProvider() {
        var unconfigured = new AiModelConfig("deepseek/deepseek-chat", "", "https://router.example/chat");
        assertThrows(IllegalStateException.class, () -> unconfigured.resolve("default", false));
        assertThrows(IllegalStateException.class, () -> unconfigured.resolve("openai/gpt-4o", true));
    }

    @Test
    void configuredDefaultIsUsedForFallbacks() {
        var custom = new AiModelConfig("google/gemini-2.5-flash", "test-key", "https://router.example/chat");
        assertEquals("google/gemini-2.5-flash", custom.resolve("default", false).modelString());
    }
}
