package com.islamic.ai.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Central registry of available LLM models.
 * Resolves a user's model selection to the correct provider URL, API key, and model string.
 */
@Component
public class AiModelConfig {

    private static final Logger log = LoggerFactory.getLogger(AiModelConfig.class);

    public enum Provider { OPENROUTER }

    /**
     * Immutable record describing one selectable LLM model.
     */
    public record ModelEntry(
            String id,           // Frontend value (e.g. "gpt-4o")
            String displayName,  // Human label
            String providerModel,// Actual model string sent to the API
            Provider provider,
            boolean premiumOnly
    ) {}

    /**
     * Resolution result — everything the caller needs to make the API call.
     */
    public record ResolvedModel(
            String modelString,
            String baseUrl,
            String apiKey,
            Provider provider
    ) {}

    private final String defaultModel;
    private final String openrouterApiKey;
    private final String openrouterBaseUrl;

    // Ordered map so frontend gets a consistent ordering
    private final Map<String, ModelEntry> models = new LinkedHashMap<>();

    public AiModelConfig(
            @Value("${app.ai.openrouter-default-model:deepseek/deepseek-chat}") String defaultModel,
            @Value("${app.ai.openrouter-api-key:}") String openrouterApiKey,
            @Value("${app.ai.openrouter-base-url:https://openrouter.ai/api/v1/chat/completions}") String openrouterBaseUrl) {

        this.defaultModel = defaultModel;
        this.openrouterApiKey = openrouterApiKey;
        this.openrouterBaseUrl = openrouterBaseUrl;

        // ── Free-tier models ──
        register(new ModelEntry("default", "Default (OpenRouter)",
                defaultModel, Provider.OPENROUTER, false));
        register(new ModelEntry("deepseek/deepseek-chat", "DeepSeek V3",
                "deepseek/deepseek-chat", Provider.OPENROUTER, false));
        register(new ModelEntry("google/gemma-4-26b-a4b-it:free", "Gemma 4 26B",
                "google/gemma-4-26b-a4b-it:free", Provider.OPENROUTER, false));

        // ── Premium-tier models ──
        register(new ModelEntry("openai/gpt-4o", "GPT-4o",
                "openai/gpt-4o", Provider.OPENROUTER, true));
        register(new ModelEntry("anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6",
                "anthropic/claude-sonnet-4.6", Provider.OPENROUTER, true));
        register(new ModelEntry("google/gemini-2.5-flash", "Gemini 2.5 Flash",
                "google/gemini-2.5-flash", Provider.OPENROUTER, true));
        register(new ModelEntry("mistralai/mistral-large", "Mistral Large",
                "mistralai/mistral-large", Provider.OPENROUTER, true));

        log.info("✦ AiModelConfig initialized — {} models ({} free, {} premium)",
                models.size(),
                models.values().stream().filter(m -> !m.premiumOnly()).count(),
                models.values().stream().filter(ModelEntry::premiumOnly).count());
    }

    private void register(ModelEntry entry) {
        models.put(entry.id(), entry);
    }

    /**
     * Resolve a user's model selection to the correct provider details.
     * Falls back to the configured OpenRouter default if selection is invalid or unauthorized.
     */
    public ResolvedModel resolve(String modelId, boolean isPremium) {
        if (openrouterApiKey == null || openrouterApiKey.isBlank()) {
            log.error("OpenRouter API key is not configured; no AI request will be sent");
            throw new IllegalStateException("AI service is not configured. Please contact support.");
        }
        // Null / blank / "default" uses the shared OpenRouter model.
        if (modelId == null || modelId.isBlank() || "default".equals(modelId)) {
            return resolveDefault();
        }

        // Keep older deployed frontends working during a rolling upgrade.
        String currentId = switch (modelId) {
            case "google/gemma-2-9b-it:free" -> "google/gemma-4-26b-a4b-it:free";
            case "anthropic/claude-3.5-sonnet" -> "anthropic/claude-sonnet-4.6";
            case "google/gemini-2.0-flash-001" -> "google/gemini-2.5-flash";
            case "mistralai/mistral-large-latest" -> "mistralai/mistral-large";
            default -> modelId;
        };
        ModelEntry entry = models.get(currentId);
        if (entry == null) {
            log.warn("⚠ Unknown model '{}', falling back to default", modelId);
            return resolveDefault();
        }

        // Premium gate: free user trying premium model → fallback
        if (entry.premiumOnly() && !isPremium) {
            log.warn("⚠ Free user tried premium model '{}', falling back to default", modelId);
            return resolveDefault();
        }

        return new ResolvedModel(entry.providerModel(), openrouterBaseUrl, openrouterApiKey, Provider.OPENROUTER);
    }

    private ResolvedModel resolveDefault() {
        return new ResolvedModel(defaultModel, openrouterBaseUrl, openrouterApiKey, Provider.OPENROUTER);
    }

    /**
     * Get all models available for a given tier (for a future /api/models endpoint if needed).
     */
    public List<ModelEntry> getAvailableModels(boolean isPremium) {
        return models.values().stream()
                .filter(m -> !m.premiumOnly() || isPremium)
                .collect(Collectors.toList());
    }
}
