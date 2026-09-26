package com.islamic.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.dto.VisualSceneResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Server-side verified catalog of AI video generators.
 * The AI returns only generator IDs — this class resolves them to full verified data.
 * Prevents hallucinated URLs, license info, and technical specifications.
 */
@Component
public class VideoGeneratorCatalog {

    private static final Logger log = LoggerFactory.getLogger(VideoGeneratorCatalog.class);

    private final ObjectMapper objectMapper;
    private final Map<String, CatalogEntry> catalog = new LinkedHashMap<>();

    public VideoGeneratorCatalog() {
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void loadCatalog() {
        try {
            InputStream is = new ClassPathResource("video-generators.json").getInputStream();
            List<CatalogEntry> entries = objectMapper.readValue(is, new TypeReference<>() {});
            for (CatalogEntry entry : entries) {
                catalog.put(entry.getId(), entry);
            }
            log.info("✦ VideoGeneratorCatalog loaded — {} verified generators", catalog.size());
        } catch (Exception e) {
            log.error("❌ Failed to load video-generators.json: {}", e.getMessage());
        }
    }

    /**
     * Get all available generator IDs (for inclusion in AI prompt).
     */
    public List<String> getAllIds() {
        return new ArrayList<>(catalog.keySet());
    }

    /**
     * Get all catalog entries (for the /generators endpoint).
     */
    public List<CatalogEntry> getAll() {
        return new ArrayList<>(catalog.values());
    }

    /**
     * Resolve AI-recommended generator IDs to full verified catalog entries.
     * Unknown IDs are silently dropped.
     *
     * @param aiRecommendedIds  List of generator IDs returned by the AI
     * @param aiReasons         Map of generator ID → AI's reason for recommending it (optional)
     * @return List of fully resolved GeneratorRecommendation DTOs
     */
    public List<VisualSceneResponse.GeneratorRecommendation> resolveRecommendations(
            List<String> aiRecommendedIds, Map<String, String> aiReasons) {

        if (aiRecommendedIds == null || aiRecommendedIds.isEmpty()) {
            return Collections.emptyList();
        }

        return aiRecommendedIds.stream()
                .filter(catalog::containsKey)
                .map(id -> {
                    CatalogEntry entry = catalog.get(id);
                    return VisualSceneResponse.GeneratorRecommendation.builder()
                            .id(entry.getId())
                            .name(entry.getName())
                            .category(entry.getCategory())
                            .generationModes(entry.getGenerationModes())
                            .license(entry.getLicense())
                            .licenseRestrictions(entry.getLicenseRestrictions())
                            .localGeneration(entry.isLocalGeneration())
                            .cloudAvailability(entry.getCloudAvailability())
                            .hardwareRequirement(entry.getHardwareRequirement())
                            .difficulty(entry.getDifficulty())
                            .officialUrl(entry.getOfficialUrl())
                            .reason(aiReasons != null ? aiReasons.getOrDefault(id, "") : "")
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Catalog entry data class — mirrors video-generators.json structure.
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CatalogEntry {
        private String id;
        private String name;
        private String category;
        private List<String> generationModes;
        private String license;
        private String licenseRestrictions;
        private boolean localGeneration;
        private String cloudAvailability;
        private String hardwareRequirement;
        private String difficulty;
        private String officialUrl;
    }
}
