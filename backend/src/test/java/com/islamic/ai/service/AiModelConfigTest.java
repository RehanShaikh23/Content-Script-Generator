package com.islamic.ai.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AiModelConfigTest {
    @Test
    void sharedDefaultUsesAvailableNvidiaModelAndAllowsEnvironmentOverride() throws Exception {
        var properties = new java.util.Properties();
        try (var input = getClass().getResourceAsStream("/application.properties")) {
            assertNotNull(input);
            properties.load(input);
        }
        assertEquals("${AI_MODEL:nvidia/llama-3.1-nemotron-70b-instruct}",
                properties.getProperty("app.ai.model"));
    }

    private final AiModelConfig config = new AiModelConfig(
            "test-nvidia", "https://nvidia.example/chat", "llama",
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
        assertEquals(AiModelConfig.Provider.NVIDIA,
                config.resolve("anthropic/claude-3.5-sonnet", false).provider());
        assertEquals(AiModelConfig.Provider.NVIDIA,
                config.resolve("anthropic/claude-sonnet-4.6", false).provider());
        assertEquals(3, config.getAvailableModels(false).size());
        assertEquals(7, config.getAvailableModels(true).size());
    }

    @Test
    void existingWorkingModelsRemainUnchanged() {
        assertEquals("deepseek/deepseek-chat", config.resolve("deepseek/deepseek-chat", false).modelString());
        assertEquals("openai/gpt-4o", config.resolve("openai/gpt-4o", true).modelString());
        assertEquals("llama", config.resolve("default", false).modelString());
    }
}
