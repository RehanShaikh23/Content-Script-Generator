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

    public enum Provider { NVIDIA, OPENROUTER }

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

    private final String nvidiaApiKey;
    private final String nvidiaBaseUrl;
    private final String nvidiaModel;
    private final String openrouterApiKey;
    private final String openrouterBaseUrl;

    // Ordered map so frontend gets a consistent ordering
    private final Map<String, ModelEntry> models = new LinkedHashMap<>();

    public AiModelConfig(
            @Value("${app.ai.api-key}") String nvidiaApiKey,
            @Value("${app.ai.base-url}") String nvidiaBaseUrl,
            @Value("${app.ai.model}") String nvidiaModel,
            @Value("${app.ai.openrouter-api-key:}") String openrouterApiKey,
            @Value("${app.ai.openrouter-base-url:https://openrouter.ai/api/v1/chat/completions}") String openrouterBaseUrl) {

        this.nvidiaApiKey = nvidiaApiKey;
        this.nvidiaBaseUrl = nvidiaBaseUrl;
        this.nvidiaModel = nvidiaModel;
        this.openrouterApiKey = openrouterApiKey;
        this.openrouterBaseUrl = openrouterBaseUrl;

        // ── Free-tier models ──
        register(new ModelEntry("default", "Llama 3.3 70B",
                nvidiaModel, Provider.NVIDIA, false));
        register(new ModelEntry("deepseek/deepseek-chat", "DeepSeek V3",
                "deepseek/deepseek-chat", Provider.OPENROUTER, false));
        register(new ModelEntry("google/gemma-2-9b-it:free", "Gemma 2 9B",
                "google/gemma-2-9b-it:free", Provider.OPENROUTER, false));

        // ── Premium-tier models ──
        register(new ModelEntry("openai/gpt-4o", "GPT-4o",
                "openai/gpt-4o", Provider.OPENROUTER, true));
        register(new ModelEntry("anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet",
                "anthropic/claude-3.5-sonnet", Provider.OPENROUTER, true));
        register(new ModelEntry("google/gemini-2.0-flash-001", "Gemini 2.0 Flash",
                "google/gemini-2.0-flash-001", Provider.OPENROUTER, true));
        register(new ModelEntry("mistralai/mistral-large-latest", "Mistral Large",
                "mistralai/mistral-large-latest", Provider.OPENROUTER, true));

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
     * Falls back to default NVIDIA model if the selection is invalid or unauthorized.
     */
    public ResolvedModel resolve(String modelId, boolean isPremium) {
        // Null / blank / "default" → NVIDIA
        if (modelId == null || modelId.isBlank() || "default".equals(modelId)) {
            return new ResolvedModel(nvidiaModel, nvidiaBaseUrl, nvidiaApiKey, Provider.NVIDIA);
        }

        ModelEntry entry = models.get(modelId);
        if (entry == null) {
            log.warn("⚠ Unknown model '{}', falling back to default", modelId);
            return new ResolvedModel(nvidiaModel, nvidiaBaseUrl, nvidiaApiKey, Provider.NVIDIA);
        }

        // Premium gate: free user trying premium model → fallback
        if (entry.premiumOnly() && !isPremium) {
            log.warn("⚠ Free user tried premium model '{}', falling back to default", modelId);
            return new ResolvedModel(nvidiaModel, nvidiaBaseUrl, nvidiaApiKey, Provider.NVIDIA);
        }

        // OpenRouter models
        if (entry.provider() == Provider.OPENROUTER) {
            if (openrouterApiKey == null || openrouterApiKey.isBlank()) {
                log.error("❌ OpenRouter API key not configured, falling back to NVIDIA");
                return new ResolvedModel(nvidiaModel, nvidiaBaseUrl, nvidiaApiKey, Provider.NVIDIA);
            }
            return new ResolvedModel(entry.providerModel(), openrouterBaseUrl, openrouterApiKey, Provider.OPENROUTER);
        }

        // NVIDIA models
        return new ResolvedModel(entry.providerModel(), nvidiaBaseUrl, nvidiaApiKey, Provider.NVIDIA);
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
