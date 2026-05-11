package com.islamic.ai.service;

import com.islamic.ai.dto.GenerateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class ScriptGenerationService {

    private static final Logger log = LoggerFactory.getLogger(ScriptGenerationService.class);

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final int standardMaxTokens;
    private final int premiumMaxTokens;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Label maps matching the frontend constants
    private static final Map<String, String> VIDEO_FORMAT_LABELS = Map.of(
            "shorts", "YouTube Short (~60 seconds)",
            "reels", "Reels/TikTok (15–90 seconds)",
            "medium", "Medium Video (3–5 minutes)",
            "long", "Full Video (8–12 minutes)"
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

    public ScriptGenerationService(
            @Value("${app.ai.api-key}") String apiKey,
            @Value("${app.ai.base-url}") String baseUrl,
            @Value("${app.ai.model}") String model,
            @Value("${app.ai.standard-max-tokens:4096}") int standardMaxTokens,
            @Value("${app.ai.premium-max-tokens:8192}") int premiumMaxTokens) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.standardMaxTokens = standardMaxTokens;
        this.premiumMaxTokens = premiumMaxTokens;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Generate a script with standard parameters (backward-compatible).
     */
    public String generateScript(GenerateRequest request) {
        return generateScript(request, false);
    }

    /**
     * Generate a script with tier-aware parameters.
     * Premium users get higher token limits and more precise output.
     */
    public String generateScript(GenerateRequest request, boolean isPremium) {
        String prompt = buildPrompt(request, isPremium);
        int maxTokens = isPremium ? premiumMaxTokens : standardMaxTokens;
        double temperature = isPremium ? 0.6 : 0.7; // Lower = more focused/accurate

        if (isPremium) {
            log.info("⚡ Premium generation: maxTokens={}, temp={}", maxTokens, temperature);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        // Determine output language
        String lang = (request.getLanguage() != null && !request.getLanguage().isBlank() && isPremium)
                ? LANGUAGE_LABELS.getOrDefault(request.getLanguage(), request.getLanguage())
                : null;
        String langInstruction = (lang != null && !"english".equalsIgnoreCase(request.getLanguage()))
                ? " You MUST write the entire script in " + lang + "."
                  + " Keep Quranic ayat in Arabic with transliteration and translation in " + lang + "."
                  + " Hadith references should also include " + lang + " translation."
                : "";

        String systemPrompt = isPremium
                ? "Expert Islamic content creator and scholar for YouTube. "
                  + "Produce deeply researched, authentic content from Quran & Sunnah with proper references "
                  + "(surah:ayah, hadith book/number, scholar opinions). Include transliterations. "
                  + "Publication-ready quality."
                  + langInstruction
                : "Expert Islamic content creator for YouTube. "
                  + "Produce accurate, authentic content from Quran & Sunnah with proper references and transliterations.";

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", maxTokens,
                "temperature", temperature
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl, HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Script generation failed: {}", e.getMessage(), e);
            throw new RuntimeException("Content generation is temporarily unavailable. Please try again shortly.");
        }
    }

    private String buildPrompt(GenerateRequest req, boolean isPremium) {
        String formatLabel = VIDEO_FORMAT_LABELS.getOrDefault(req.getVideoFormat(), req.getVideoFormat());
        String categoryLabel = CATEGORY_LABELS.getOrDefault(req.getCategory(), req.getCategory());

        // Handle custom tone — if customTone is provided, use it directly
        String toneLabel;
        if (req.getCustomTone() != null && !req.getCustomTone().isBlank()) {
            toneLabel = req.getCustomTone();
        } else {
            toneLabel = TONE_LABELS.getOrDefault(req.getTone(), req.getTone());
        }

        StringBuilder sb = new StringBuilder();
        sb.append("TOPIC: ").append(req.getTopic());
        sb.append("\nFORMAT: ").append(formatLabel);
        sb.append("\nCATEGORY: ").append(categoryLabel);
        sb.append("\nTONE: ").append(toneLabel);

        // Language instruction for premium multi-language
        if (isPremium && req.getLanguage() != null && !req.getLanguage().isBlank()
                && !"english".equalsIgnoreCase(req.getLanguage())) {
            String langLabel = LANGUAGE_LABELS.getOrDefault(req.getLanguage(), req.getLanguage());
            sb.append("\nLANGUAGE: ").append(langLabel);
        }

        if (req.getExtra() != null && !req.getExtra().isBlank()) {
            sb.append("\nCONTEXT: ").append(req.getExtra());
        }

        sb.append("\n\nGenerate: title options, hook, full timestamped script, closing dua, CTA, hashtags, description.");

        if (isPremium) {
            sb.append("\nPremium: detailed content, multiple titles, precise Quran refs (surah:ayah), hadith refs (book/number), SEO tags.");
        }

        return sb.toString();
    }
}
