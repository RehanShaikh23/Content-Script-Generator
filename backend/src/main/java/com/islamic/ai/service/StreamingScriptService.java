package com.islamic.ai.service;

import com.islamic.ai.dto.GenerateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class StreamingScriptService {

    private static final Logger log = LoggerFactory.getLogger(StreamingScriptService.class);

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final int standardMaxTokens;
    private final int premiumMaxTokens;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final ScriptGenerationService scriptGenerationService;

    // Label maps (reuse from ScriptGenerationService patterns)
    private static final Map<String, String> VIDEO_FORMAT_LABELS = Map.of(
            "shorts", "YouTube Short (~60s)",
            "reels", "Reels/TikTok (15–90s)",
            "medium", "Medium Video (3–5min)",
            "long", "Full Video (8–12min)"
    );

    private static final Map<String, String> CATEGORY_LABELS = Map.of(
            "quran", "Quran & Tafsir",
            "hadith", "Hadith & Sunnah",
            "prophets", "Prophets' Stories",
            "history", "Islamic History",
            "fiqh", "Fiqh & Rulings",
            "dua", "Duas & Dhikr",
            "akhira", "Akhirah & Jannah",
            "modern", "Modern Islamic Issues"
    );

    private static final Map<String, String> TONE_LABELS = Map.of(
            "educational", "Educational",
            "inspirational", "Inspirational",
            "storytelling", "Story-based Narrative",
            "reminder", "Gentle Reminder",
            "qa", "Q&A Style",
            "scholarly", "Scholarly & Academic",
            "emotional", "Emotional & Heart-touching"
    );

    private static final Map<String, String> LANGUAGE_LABELS = Map.ofEntries(
            Map.entry("english", "English"),
            Map.entry("arabic", "Arabic (العربية)"),
            Map.entry("urdu", "Urdu (اردو)"),
            Map.entry("hindi", "Hindi (हिन्दी)"),
            Map.entry("bangla", "Bangla (বাংলা)"),
            Map.entry("turkish", "Turkish (Türkçe)"),
            Map.entry("malay", "Malay / Indonesian"),
            Map.entry("french", "French (Français)"),
            Map.entry("spanish", "Spanish (Español)")
    );

    public StreamingScriptService(
            @Value("${app.ai.api-key}") String apiKey,
            @Value("${app.ai.base-url}") String baseUrl,
            @Value("${app.ai.model}") String model,
            @Value("${app.ai.standard-max-tokens:4096}") int standardMaxTokens,
            @Value("${app.ai.premium-max-tokens:8192}") int premiumMaxTokens,
            ScriptGenerationService scriptGenerationService) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.standardMaxTokens = standardMaxTokens;
        this.premiumMaxTokens = premiumMaxTokens;
        this.scriptGenerationService = scriptGenerationService;
        this.objectMapper = new ObjectMapper();

        this.webClient = WebClient.builder()
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("Accept", "text/event-stream")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
                .build();

        log.info("✦ StreamingScriptService initialized — model={}", model);
    }

    /**
     * Stream script generation via SSE.
     * Sends chunks as they arrive from the NVIDIA API.
     * Returns the SseEmitter and accumulates the full script via callback.
     */
    public SseEmitter streamScript(GenerateRequest request, boolean isPremium,
                                    ScriptStreamCallback callback) {
        // 5-minute timeout for long generations
        SseEmitter emitter = new SseEmitter(300_000L);
        AtomicBoolean completed = new AtomicBoolean(false);

        String prompt = buildOptimizedPrompt(request, isPremium);
        String systemPrompt = buildSystemPrompt(request, isPremium);
        int maxTokens = isPremium ? premiumMaxTokens : standardMaxTokens;
        double temperature = isPremium ? 0.6 : 0.7;

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", maxTokens,
                "temperature", temperature,
                "stream", true
        );

        StringBuilder fullScript = new StringBuilder();

        emitter.onCompletion(() -> {
            log.debug("SSE emitter completed");
        });
        emitter.onTimeout(() -> {
            log.warn("SSE emitter timed out");
            if (!completed.get()) {
                callback.onError(new RuntimeException("Stream timed out"));
            }
        });
        emitter.onError(error -> {
            log.error("SSE emitter error: {}", error.getMessage());
        });

        // Make the streaming call
        try {
            String bodyJson = objectMapper.writeValueAsString(body);

            webClient.post()
                    .uri(baseUrl)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(bodyJson)
                    .retrieve()
                    .bodyToFlux(org.springframework.core.io.buffer.DataBuffer.class)
                    .map(dataBuffer -> {
                        byte[] bytes = new byte[dataBuffer.readableByteCount()];
                        dataBuffer.read(bytes);
                        org.springframework.core.io.buffer.DataBufferUtils.release(dataBuffer);
                        return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                    })
                    .concatMap(rawChunk -> {
                        // Each raw chunk may contain multiple SSE lines
                        return Flux.fromArray(rawChunk.split("\n"))
                                .filter(l -> l.startsWith("data: "))
                                .map(l -> l.substring(6).trim());
                    })
                    .subscribe(
                            data -> {
                                if ("[DONE]".equals(data)) {
                                    // Stream complete
                                    if (completed.compareAndSet(false, true)) {
                                        try {
                                            emitter.send(SseEmitter.event()
                                                    .name("done")
                                                    .data("complete"));
                                            emitter.complete();
                                            callback.onComplete(fullScript.toString());
                                        } catch (IOException e) {
                                            log.error("Error sending done event: {}", e.getMessage());
                                        }
                                    }
                                    return;
                                }

                                try {
                                    JsonNode node = objectMapper.readTree(data);
                                    JsonNode delta = node.path("choices").get(0).path("delta").path("content");
                                    if (!delta.isMissingNode() && !delta.isNull()) {
                                        String chunk = delta.asText();
                                        if (!chunk.isEmpty()) {
                                            fullScript.append(chunk);
                                            emitter.send(SseEmitter.event()
                                                    .name("chunk")
                                                    .data(chunk));
                                        }
                                    }
                                } catch (Exception e) {
                                    log.trace("Skipping unparseable SSE chunk: {}", data.substring(0, Math.min(50, data.length())));
                                }
                            },
                            error -> {
                                log.error("Stream error: {}", error.getMessage());
                                if (completed.compareAndSet(false, true)) {
                                    // Fall back to non-streaming generation
                                    log.info("⚠ Falling back to non-streaming generation...");
                                    try {
                                        String script = scriptGenerationService.generateScript(request, isPremium);
                                        emitter.send(SseEmitter.event()
                                                .name("cached")
                                                .data(script));
                                        emitter.send(SseEmitter.event()
                                                .name("done")
                                                .data("complete"));
                                        emitter.complete();
                                        callback.onComplete(script);
                                    } catch (Exception fallbackError) {
                                        try {
                                            emitter.send(SseEmitter.event()
                                                    .name("error")
                                                    .data("Content generation is temporarily unavailable. Please try again shortly."));
                                            emitter.completeWithError(fallbackError);
                                        } catch (IOException ex) {
                                            log.error("Failed to send error event", ex);
                                        }
                                        callback.onError(fallbackError);
                                    }
                                }
                            },
                            () -> {
                                // onComplete from Flux — in case [DONE] was missed
                                if (completed.compareAndSet(false, true)) {
                                    try {
                                        emitter.send(SseEmitter.event()
                                                .name("done")
                                                .data("complete"));
                                        emitter.complete();
                                        callback.onComplete(fullScript.toString());
                                    } catch (IOException e) {
                                        log.error("Error in onComplete: {}", e.getMessage());
                                    }
                                }
                            }
                    );
        } catch (Exception e) {
            log.error("Failed to initiate streaming: {}", e.getMessage());
            // Fall back to non-streaming
            try {
                String script = scriptGenerationService.generateScript(request, isPremium);
                emitter.send(SseEmitter.event().name("cached").data(script));
                emitter.send(SseEmitter.event().name("done").data("complete"));
                emitter.complete();
                callback.onComplete(script);
            } catch (Exception fallbackError) {
                try {
                    emitter.send(SseEmitter.event().name("error").data("Content generation is temporarily unavailable. Please try again shortly."));
                    emitter.completeWithError(fallbackError);
                } catch (IOException ex) {
                    log.error("Failed to send fallback error", ex);
                }
                callback.onError(fallbackError);
            }
        }

        return emitter;
    }

    /**
     * Optimized system prompt — concise but effective.
     */
    private String buildSystemPrompt(GenerateRequest request, boolean isPremium) {
        String lang = (request.getLanguage() != null && !request.getLanguage().isBlank() && isPremium)
                ? LANGUAGE_LABELS.getOrDefault(request.getLanguage(), request.getLanguage())
                : null;
        String langInstruction = (lang != null && !"english".equalsIgnoreCase(request.getLanguage()))
                ? " Write entirely in " + lang + ". Keep Quranic ayat in Arabic with transliteration and " + lang + " translation."
                : "";

        if (isPremium) {
            return "Expert Islamic content creator and scholar for YouTube. "
                    + "Produce deeply researched, authentic content from Quran & Sunnah with proper references "
                    + "(surah:ayah, hadith book/number, scholar opinions). Include transliterations. "
                    + "Publication-ready quality." + langInstruction;
        }
        return "Expert Islamic content creator for YouTube. "
                + "Produce accurate, authentic content from Quran & Sunnah with proper references and transliterations.";
    }

    /**
     * Optimized user prompt — compact key-value format for faster inference.
     */
    private String buildOptimizedPrompt(GenerateRequest request, boolean isPremium) {
        String formatLabel = VIDEO_FORMAT_LABELS.getOrDefault(request.getVideoFormat(), request.getVideoFormat());
        String categoryLabel = CATEGORY_LABELS.getOrDefault(request.getCategory(), request.getCategory());

        String toneLabel;
        if (request.getCustomTone() != null && !request.getCustomTone().isBlank()) {
            toneLabel = request.getCustomTone();
        } else {
            toneLabel = TONE_LABELS.getOrDefault(request.getTone(), request.getTone());
        }

        StringBuilder sb = new StringBuilder();
        sb.append("TOPIC: ").append(request.getTopic());
        sb.append("\nFORMAT: ").append(formatLabel);
        sb.append("\nCATEGORY: ").append(categoryLabel);
        sb.append("\nTONE: ").append(toneLabel);

        if (isPremium && request.getLanguage() != null && !request.getLanguage().isBlank()
                && !"english".equalsIgnoreCase(request.getLanguage())) {
            sb.append("\nLANGUAGE: ").append(LANGUAGE_LABELS.getOrDefault(request.getLanguage(), request.getLanguage()));
        }

        if (request.getExtra() != null && !request.getExtra().isBlank()) {
            sb.append("\nCONTEXT: ").append(request.getExtra());
        }

        sb.append("\n\nGenerate: title options, hook, full timestamped script, closing dua, CTA, hashtags, description.");

        if (isPremium) {
            sb.append("\nPremium: detailed content, multiple titles, precise Quran refs (surah:ayah), hadith refs (book/number), SEO tags.");
        }

        return sb.toString();
    }

    /**
     * Callback interface for stream completion/error handling.
     */
    public interface ScriptStreamCallback {
        void onComplete(String fullScript);
        void onError(Throwable error);
    }
}
