package com.islamic.ai.service;

import com.islamic.ai.dto.GenerateRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class ScriptGenerationService {

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // Label maps matching the frontend constants
    private static final Map<String, String> VIDEO_FORMAT_LABELS = Map.of(
            "shorts", "YouTube Short (~60 seconds)",
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
            "qa", "Q&A Style"
    );

    public ScriptGenerationService(
            @Value("${app.ai.api-key}") String apiKey,
            @Value("${app.ai.base-url}") String baseUrl,
            @Value("${app.ai.model}") String model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public String generateScript(GenerateRequest request) {
        String prompt = buildPrompt(request);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are an expert Islamic content creator specializing in YouTube scripts. " +
                                "You produce accurate, authentic content based on Quran and Sunnah. " +
                                "Always include proper references and transliterations."),
                        Map.of("role", "user", "content", prompt)
                ),
                "max_tokens", 4096,
                "temperature", 0.7
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl, HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate script: " + e.getMessage(), e);
        }
    }

    private String buildPrompt(GenerateRequest req) {
        String formatLabel = VIDEO_FORMAT_LABELS.getOrDefault(req.getVideoFormat(), req.getVideoFormat());
        String categoryLabel = CATEGORY_LABELS.getOrDefault(req.getCategory(), req.getCategory());
        String toneLabel = TONE_LABELS.getOrDefault(req.getTone(), req.getTone());

        StringBuilder sb = new StringBuilder();
        sb.append("Generate an Islamic YouTube script with these settings:\n");
        sb.append("- TOPIC: ").append(req.getTopic()).append("\n");
        sb.append("- FORMAT: ").append(formatLabel).append("\n");
        sb.append("- CATEGORY: ").append(categoryLabel).append("\n");
        sb.append("- TONE: ").append(toneLabel);

        if (req.getExtra() != null && !req.getExtra().isBlank()) {
            sb.append("\n- EXTRA CONTEXT: ").append(req.getExtra());
        }

        sb.append("\n\nPlease generate a complete, authentic Islamic script with: ");
        sb.append("title options, hook, full script with timestamps, closing dua, ");
        sb.append("call to action, hashtags, and video description.");

        return sb.toString();
    }
}
