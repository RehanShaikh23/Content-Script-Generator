package com.islamic.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisualSceneResponse {
    private String generationId;
    private String scriptId;
    private String sceneId;
    private int sceneNumber;

    private String visualPrompt;
    private String negativePrompt;
    private String visualObjective;

    private VisualDirection visualDirection;
    private Camera camera;
    private String lighting;
    private int estimatedDuration;
    private String aspectRatio;

    private List<GeneratorRecommendation> generators;
    private SearchQueries searchQueries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VisualDirection {
        private String subject;
        private String action;
        private String environment;
        private String location;
        private String timeOfDay;
        private String mood;
        private String style;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Camera {
        private String shot;
        private String movement;
        private String lens;
        private String composition;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneratorRecommendation {
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
        private String reason;      // AI-generated explanation of why this generator suits the scene
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchQueries {
        private List<String> pinterest;
        private List<String> googleImages;
        private List<String> googleVideo;
        private List<String> youtube;
        private List<String> stockFootage;
    }
}
