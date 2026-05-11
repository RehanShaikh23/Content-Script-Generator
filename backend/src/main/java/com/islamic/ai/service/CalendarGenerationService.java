package com.islamic.ai.service;

import com.islamic.ai.dto.CalendarGenerateRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CalendarGenerationService {

    private static final Logger log = LoggerFactory.getLogger(CalendarGenerationService.class);

    private final String apiKey;
    private final String baseUrl;
    private final String model;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final int BATCH_SIZE = 7;

    private static final Map<String, String> CATEGORY_LABELS = Map.of(
            "quran", "Quran & Tafsir",
            "hadith", "Hadith & Sunnah",
            "prophets", "Prophets' Stories",
            "history", "Islamic History",
            "fiqh", "Fiqh & Rulings",
            "dua", "Duas & Dhikr",
            "akhira", "Akhirah & Jannah",
            "modern", "Modern Islamic Issues",
            "reminders", "Daily Reminders"
    );

    private static final Map<String, String> TONE_LABELS = Map.of(
            "educational", "Educational",
            "inspirational", "Inspirational",
            "storytelling", "Story-based Narrative",
            "reminder", "Gentle Reminder"
    );

    private static final Map<String, String> PLATFORM_LABELS = Map.of(
            "shorts", "YouTube Shorts (~60 seconds)",
            "reels", "Instagram Reels / TikTok (15-90 seconds)"
    );

    // Emotional tones to balance across the calendar
    private static final List<String> EMOTIONAL_TONES = List.of(
            "Sabr (Patience)", "Tawakkul (Trust in Allah)",
            "Gratitude (Shukr)", "Akhirah (Hereafter)",
            "Repentance (Tawbah)", "Hope (Rajaa)",
            "Love of Allah", "Brotherhood & Unity"
    );

    // Categories to auto-mix when user selects "auto_mix"
    private static final List<String> AUTO_MIX_CATEGORIES = List.of(
            "quran", "hadith", "prophets", "history", "dua", "akhira", "reminders", "modern"
    );

    // Suggested posting times by region
    private static final Map<String, List<String>> POSTING_TIMES_BY_REGION = Map.of(
            "Asia", List.of("6:30 AM", "12:30 PM", "5:00 PM", "9:00 PM"),
            "Europe", List.of("7:00 AM", "12:00 PM", "5:30 PM", "8:30 PM"),
            "America", List.of("8:00 AM", "12:00 PM", "5:00 PM", "9:00 PM"),
            "Africa", List.of("7:00 AM", "1:00 PM", "5:30 PM", "9:30 PM"),
            "default", List.of("8:00 AM", "12:30 PM", "5:00 PM", "9:00 PM")
    );

    public CalendarGenerationService(
            @Value("${app.ai.api-key}") String apiKey,
            @Value("${app.ai.base-url}") String baseUrl,
            @Value("${app.ai.model}") String model) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.model = model;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        log.info("✦ CalendarGenerationService initialized");
    }

    /**
     * Generate a full content calendar by batching AI calls (7 days per batch).
     */
    public List<Map<String, Object>> generateCalendar(CalendarGenerateRequest request, boolean isPremium) {
        int totalDays = request.getDuration();
        String timezone = request.getTimezone() != null ? request.getTimezone() : "UTC";
        String region = detectRegion(timezone);
        List<String> postingTimes = POSTING_TIMES_BY_REGION.getOrDefault(region,
                POSTING_TIMES_BY_REGION.get("default"));

        List<Map<String, Object>> allDays = new ArrayList<>();
        List<String> usedTopics = new ArrayList<>();

        int batchCount = (int) Math.ceil((double) totalDays / BATCH_SIZE);

        for (int batch = 0; batch < batchCount; batch++) {
            int startDay = batch * BATCH_SIZE + 1;
            int endDay = Math.min(startDay + BATCH_SIZE - 1, totalDays);
            int daysInBatch = endDay - startDay + 1;

            log.info("✦ Generating calendar batch {}/{} (days {}-{})", batch + 1, batchCount, startDay, endDay);

            // Assign categories for this batch
            List<String> batchCategories = assignCategories(request.getCategory(), daysInBatch, batch);
            // Assign emotional tones
            List<String> batchEmotionalTones = assignEmotionalTones(daysInBatch, batch);

            String prompt = buildBatchPrompt(request, startDay, endDay, daysInBatch,
                    batchCategories, batchEmotionalTones, usedTopics, postingTimes, isPremium);

            String systemPrompt = buildSystemPrompt(isPremium);

            try {
                String response = callAI(systemPrompt, prompt, isPremium);
                List<Map<String, Object>> batchDays = parseCalendarResponse(response, startDay, endDay, timezone);

                // Fill in dates and defaults
                LocalDate startDate = LocalDate.now(ZoneId.of(timezone));
                for (Map<String, Object> day : batchDays) {
                    int dayNum = (int) day.get("dayNumber");
                    day.put("date", startDate.plusDays(dayNum - 1).format(DateTimeFormatter.ISO_LOCAL_DATE));
                    day.putIfAbsent("isPosted", false);

                    // Track used topics for diversity
                    String topic = (String) day.getOrDefault("topic", "");
                    if (!topic.isBlank()) usedTopics.add(topic);
                }

                allDays.addAll(batchDays);

            } catch (Exception e) {
                log.error("Failed to generate batch {}: {}", batch + 1, e.getMessage());
                // Generate fallback entries for this batch
                LocalDate startDate = LocalDate.now(ZoneId.of(timezone));
                for (int d = startDay; d <= endDay; d++) {
                    Map<String, Object> fallback = new LinkedHashMap<>();
                    fallback.put("dayNumber", d);
                    fallback.put("date", startDate.plusDays(d - 1).format(DateTimeFormatter.ISO_LOCAL_DATE));
                    fallback.put("topic", "Day " + d + " — Islamic Reminder");
                    fallback.put("script", "Content generation failed for this day. Please regenerate.");
                    fallback.put("caption", "Daily Islamic reminder ✨");
                    fallback.put("hashtags", List.of("#Islam", "#Islamic", "#Muslim", "#Reminder"));
                    fallback.put("postingTime", postingTimes.get(d % postingTimes.size()));
                    fallback.put("isPosted", false);
                    fallback.put("category", batchCategories.get((d - startDay) % batchCategories.size()));
                    fallback.put("emotionalTone", "Hope (Rajaa)");
                    allDays.add(fallback);
                }
            }
        }

        return allDays;
    }

    /**
     * Regenerate content for a single day, avoiding existing topics.
     */
    public Map<String, Object> regenerateDay(List<Map<String, Object>> existingDays, int dayNumber,
                                              CalendarGenerateRequest request, boolean isPremium) {
        String timezone = request.getTimezone() != null ? request.getTimezone() : "UTC";
        String region = detectRegion(timezone);
        List<String> postingTimes = POSTING_TIMES_BY_REGION.getOrDefault(region,
                POSTING_TIMES_BY_REGION.get("default"));

        // Collect existing topics to avoid
        List<String> usedTopics = existingDays.stream()
                .filter(d -> (int) d.get("dayNumber") != dayNumber)
                .map(d -> (String) d.getOrDefault("topic", ""))
                .filter(t -> !t.isBlank())
                .collect(Collectors.toList());

        String categoryLabel = CATEGORY_LABELS.getOrDefault(request.getCategory(),
                request.getCategory() != null ? request.getCategory() : "Auto Mix");
        String toneLabel = TONE_LABELS.getOrDefault(request.getTone(), request.getTone());
        String platformLabel = PLATFORM_LABELS.getOrDefault(request.getPlatform(), request.getPlatform());

        // Pick a random emotional tone
        String emotionalTone = EMOTIONAL_TONES.get(dayNumber % EMOTIONAL_TONES.size());

        StringBuilder prompt = new StringBuilder();
        prompt.append("Generate content for DAY ").append(dayNumber).append(" of an Islamic content calendar.\n\n");
        prompt.append("PLATFORM: ").append(platformLabel).append("\n");
        prompt.append("CATEGORY: ").append(categoryLabel).append("\n");
        prompt.append("TONE: ").append(toneLabel).append("\n");
        prompt.append("EMOTIONAL THEME: ").append(emotionalTone).append("\n");
        prompt.append("POSTING TIME: ").append(postingTimes.get(dayNumber % postingTimes.size())).append("\n\n");

        if (!usedTopics.isEmpty()) {
            prompt.append("AVOID these topics (already used): ").append(String.join(", ", usedTopics)).append("\n\n");
        }

        prompt.append("Return ONLY a valid JSON object (no markdown, no code fences) with this structure:\n");
        prompt.append("{\n");
        prompt.append("  \"dayNumber\": ").append(dayNumber).append(",\n");
        prompt.append("  \"topic\": \"<unique topic title>\",\n");
        prompt.append("  \"script\": \"<short script for the video, 3-6 sentences>\",\n");
        prompt.append("  \"caption\": \"<social media caption, 1-2 sentences>\",\n");
        prompt.append("  \"hashtags\": [\"#tag1\", \"#tag2\", \"#tag3\", \"#tag4\"],\n");
        prompt.append("  \"postingTime\": \"<suggested time>\",\n");
        prompt.append("  \"category\": \"<category key>\",\n");
        prompt.append("  \"emotionalTone\": \"<emotional theme>\"\n");
        prompt.append("}\n");

        String systemPrompt = buildSystemPrompt(isPremium);

        try {
            String response = callAI(systemPrompt, prompt.toString(), isPremium);
            Map<String, Object> day = parseSingleDayResponse(response, dayNumber);

            LocalDate startDate = LocalDate.now(ZoneId.of(timezone));
            day.put("date", startDate.plusDays(dayNumber - 1).format(DateTimeFormatter.ISO_LOCAL_DATE));
            day.putIfAbsent("isPosted", false);

            return day;
        } catch (Exception e) {
            log.error("Failed to regenerate day {}: {}", dayNumber, e.getMessage());
            throw new RuntimeException("Failed to regenerate content for day " + dayNumber);
        }
    }

    private String buildSystemPrompt(boolean isPremium) {
        if (isPremium) {
            return "You are an expert Islamic content strategist and scholar. "
                    + "Generate deeply researched, authentic content plans from Quran & Sunnah with proper references. "
                    + "Each topic should be unique, engaging, and suitable for social media. "
                    + "Always respond with valid JSON only — no markdown, no code fences, no explanation.";
        }
        return "You are an Islamic content strategist. "
                + "Generate authentic content plans from Quran & Sunnah. "
                + "Each topic should be unique and engaging for social media. "
                + "Always respond with valid JSON only — no markdown, no code fences, no explanation.";
    }

    private String buildBatchPrompt(CalendarGenerateRequest request, int startDay, int endDay,
                                     int daysInBatch, List<String> categories,
                                     List<String> emotionalTones, List<String> usedTopics,
                                     List<String> postingTimes, boolean isPremium) {
        String platformLabel = PLATFORM_LABELS.getOrDefault(request.getPlatform(), request.getPlatform());
        String toneLabel = TONE_LABELS.getOrDefault(request.getTone(), request.getTone());

        StringBuilder sb = new StringBuilder();
        sb.append("Generate a ").append(daysInBatch).append("-day Islamic content calendar (Days ")
                .append(startDay).append("-").append(endDay).append(").\n\n");
        sb.append("PLATFORM: ").append(platformLabel).append("\n");
        sb.append("OVERALL TONE: ").append(toneLabel).append("\n\n");

        sb.append("For each day, use these specific categories and emotional themes:\n");
        for (int i = 0; i < daysInBatch; i++) {
            int dayNum = startDay + i;
            String cat = CATEGORY_LABELS.getOrDefault(categories.get(i), categories.get(i));
            sb.append("  Day ").append(dayNum).append(": Category=").append(cat)
                    .append(", Emotional Theme=").append(emotionalTones.get(i))
                    .append(", Posting Time=").append(postingTimes.get(dayNum % postingTimes.size()))
                    .append("\n");
        }

        if (!usedTopics.isEmpty()) {
            sb.append("\nAVOID these topics (already used in previous days): ");
            // Only send last 20 to avoid token overflow
            List<String> recentTopics = usedTopics.size() > 20
                    ? usedTopics.subList(usedTopics.size() - 20, usedTopics.size())
                    : usedTopics;
            sb.append(String.join(", ", recentTopics)).append("\n");
        }

        sb.append("\nRules:\n");
        sb.append("- Each topic MUST be unique — never repeat across days\n");
        sb.append("- Scripts should be concise (3-6 sentences), suitable for ").append(platformLabel).append("\n");
        sb.append("- Captions should be engaging, 1-2 sentences with emoji\n");
        sb.append("- Include exactly 4 relevant hashtags per day\n");
        sb.append("- Balance the content: mix informative, emotional, and action-oriented\n");
        if (isPremium) {
            sb.append("- Include Quranic references (surah:ayah) or Hadith references where relevant\n");
        }

        sb.append("\nReturn ONLY a valid JSON array (no markdown, no code fences) with this structure:\n");
        sb.append("[\n");
        sb.append("  {\n");
        sb.append("    \"dayNumber\": ").append(startDay).append(",\n");
        sb.append("    \"topic\": \"<unique topic title>\",\n");
        sb.append("    \"script\": \"<short script for the video>\",\n");
        sb.append("    \"caption\": \"<social media caption>\",\n");
        sb.append("    \"hashtags\": [\"#tag1\", \"#tag2\", \"#tag3\", \"#tag4\"],\n");
        sb.append("    \"postingTime\": \"<time>\",\n");
        sb.append("    \"category\": \"<category key>\",\n");
        sb.append("    \"emotionalTone\": \"<emotional theme>\"\n");
        sb.append("  }\n");
        sb.append("  // ... one object per day\n");
        sb.append("]\n");

        return sb.toString();
    }

    private String callAI(String systemPrompt, String userPrompt, boolean isPremium) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        int maxTokens = isPremium ? 6000 : 4096;

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", maxTokens,
                "temperature", 0.7
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl, HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("AI API call failed: {}", e.getMessage(), e);
            throw new RuntimeException("Content generation is temporarily unavailable. Please try again shortly.");
        }
    }

    private List<Map<String, Object>> parseCalendarResponse(String response, int startDay, int endDay, String timezone) {
        try {
            // Clean response — strip markdown fences if present
            String cleaned = response.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").trim();
            }

            List<Map<String, Object>> days = objectMapper.readValue(cleaned,
                    new TypeReference<List<Map<String, Object>>>() {});

            // Validate and fix day numbers
            for (int i = 0; i < days.size(); i++) {
                days.get(i).put("dayNumber", startDay + i);
            }

            return days;
        } catch (Exception e) {
            log.error("Failed to parse calendar batch response: {}", e.getMessage());
            log.debug("Raw response: {}", response.substring(0, Math.min(500, response.length())));
            throw new RuntimeException("Failed to parse AI response for calendar batch");
        }
    }

    private Map<String, Object> parseSingleDayResponse(String response, int dayNumber) {
        try {
            String cleaned = response.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```[a-zA-Z]*\\n?", "").replaceAll("```$", "").trim();
            }

            Map<String, Object> day = objectMapper.readValue(cleaned,
                    new TypeReference<Map<String, Object>>() {});
            day.put("dayNumber", dayNumber);
            return day;
        } catch (Exception e) {
            log.error("Failed to parse single day response: {}", e.getMessage());
            throw new RuntimeException("Failed to parse AI response for day " + dayNumber);
        }
    }

    private List<String> assignCategories(String requestedCategory, int count, int batchIndex) {
        List<String> categories = new ArrayList<>();

        if ("auto_mix".equals(requestedCategory) || requestedCategory == null || requestedCategory.isBlank()) {
            // Auto-mix: rotate through categories with offset per batch
            int offset = batchIndex * BATCH_SIZE;
            for (int i = 0; i < count; i++) {
                categories.add(AUTO_MIX_CATEGORIES.get((offset + i) % AUTO_MIX_CATEGORIES.size()));
            }
        } else {
            // Single category requested — still mix in some variety
            for (int i = 0; i < count; i++) {
                if (i % 3 == 0 && count > 3) {
                    // Every 3rd day, inject a complementary category
                    categories.add(AUTO_MIX_CATEGORIES.get((batchIndex * 3 + i) % AUTO_MIX_CATEGORIES.size()));
                } else {
                    categories.add(requestedCategory);
                }
            }
        }

        return categories;
    }

    private List<String> assignEmotionalTones(int count, int batchIndex) {
        List<String> tones = new ArrayList<>();
        int offset = batchIndex * BATCH_SIZE;
        for (int i = 0; i < count; i++) {
            tones.add(EMOTIONAL_TONES.get((offset + i) % EMOTIONAL_TONES.size()));
        }
        return tones;
    }

    private String detectRegion(String timezone) {
        if (timezone == null || timezone.isBlank()) return "default";
        try {
            ZoneId zone = ZoneId.of(timezone);
            String id = zone.getId();
            if (id.startsWith("Asia/") || id.startsWith("Indian/")) return "Asia";
            if (id.startsWith("Europe/")) return "Europe";
            if (id.startsWith("America/") || id.startsWith("US/") || id.startsWith("Canada/")) return "America";
            if (id.startsWith("Africa/")) return "Africa";
            return "default";
        } catch (Exception e) {
            return "default";
        }
    }
}
