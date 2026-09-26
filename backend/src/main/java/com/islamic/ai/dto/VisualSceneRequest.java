package com.islamic.ai.dto;

import lombok.Data;

@Data
public class VisualSceneRequest {
    private String generationId;
    private String scriptId;
    private String sceneId;
    private int sceneNumber;
    private String sceneTitle;
    private String scriptText;          // scene narration only — NOT the entire script

    private GlobalVisualProfile globalVisualProfile;
    private UserVisualSettings userSettings;

    @Data
    public static class GlobalVisualProfile {
        private String style;
        private String visualEra;
        private String realismLevel;
        private String colorTreatment;
        private String cinematicStyle;
        private String lightingStyle;
        private String cameraLanguage;
        private String environmentStyle;
    }

    @Data
    public static class UserVisualSettings {
        private String aspectRatio;     // "16:9", "9:16", "1:1"
        private int duration;           // 5, 8, 10, 15 seconds
        private String generationMode;  // "ai_generated", "stock_footage", "mixed"
    }
}
