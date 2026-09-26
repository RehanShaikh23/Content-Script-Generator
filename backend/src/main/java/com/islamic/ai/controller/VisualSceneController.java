package com.islamic.ai.controller;

import com.islamic.ai.dto.VisualProfileRequest;
import com.islamic.ai.dto.VisualSceneRequest;
import com.islamic.ai.dto.VisualSceneResponse;
import com.islamic.ai.service.VideoGeneratorCatalog;
import com.islamic.ai.service.VisualSceneService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for the Visual Scene Agent.
 * Endpoints are separate from the existing script generation pipeline.
 * All endpoints require JWT authentication.
 */
@RestController
@RequestMapping("/api/visual-scene")
@RequiredArgsConstructor
public class VisualSceneController {

    private static final Logger log = LoggerFactory.getLogger(VisualSceneController.class);

    private final VisualSceneService visualSceneService;
    private final VideoGeneratorCatalog generatorCatalog;

    /**
     * Generate visual direction for a single scene.
     *
     * POST /api/visual-scene/generate
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateVisualScene(@RequestBody VisualSceneRequest request) {
        try {
            // Validate required fields
            if (request.getScriptText() == null || request.getScriptText().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Scene text is required"));
            }
            if (request.getGenerationId() == null || request.getGenerationId().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Generation ID is required"));
            }
            if (request.getSceneId() == null || request.getSceneId().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Scene ID is required"));
            }

            VisualSceneResponse response = visualSceneService.generateVisualScene(request);
            return ResponseEntity.ok(response);

        } catch (RuntimeException e) {
            log.error("Visual scene generation failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "error", e.getMessage(),
                            "generationId", request.getGenerationId() != null ? request.getGenerationId() : "",
                            "sceneId", request.getSceneId() != null ? request.getSceneId() : ""
                    ));
        }
    }

    /**
     * Generate a global visual profile for a script.
     * Called once per script generation — provides visual consistency across scenes.
     *
     * POST /api/visual-scene/profile
     */
    @PostMapping("/profile")
    public ResponseEntity<?> generateVisualProfile(@RequestBody VisualProfileRequest request) {
        try {
            if (request.getTopic() == null || request.getTopic().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Topic is required"));
            }

            Map<String, String> profile = visualSceneService.generateGlobalProfile(request);
            return ResponseEntity.ok(Map.of("globalVisualProfile", profile));

        } catch (RuntimeException e) {
            log.error("Visual profile generation failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Return the verified generator catalog.
     * Frontend uses this to display generator details.
     *
     * GET /api/visual-scene/generators
     */
    @GetMapping("/generators")
    public ResponseEntity<?> getGeneratorCatalog() {
        List<VideoGeneratorCatalog.CatalogEntry> generators = generatorCatalog.getAll();
        return ResponseEntity.ok(Map.of("generators", generators));
    }

    /**
     * Return available visual style presets.
     *
     * GET /api/visual-scene/styles
     */
    @GetMapping("/styles")
    public ResponseEntity<?> getVisualStyles() {
        // These match the frontend VISUAL_STYLES constants
        List<Map<String, String>> styles = List.of(
                Map.of("value", "cinematic_documentary", "label", "Cinematic Documentary"),
                Map.of("value", "historical_documentary", "label", "Historical Documentary"),
                Map.of("value", "realistic", "label", "Realistic"),
                Map.of("value", "dark_cinematic", "label", "Dark Cinematic"),
                Map.of("value", "warm_cinematic", "label", "Warm Cinematic"),
                Map.of("value", "epic_historical", "label", "Epic Historical"),
                Map.of("value", "minimal_documentary", "label", "Minimal Documentary"),
                Map.of("value", "photorealistic", "label", "Photorealistic"),
                Map.of("value", "slow_atmospheric", "label", "Slow Atmospheric"),
                Map.of("value", "news_documentary", "label", "News Documentary")
        );
        return ResponseEntity.ok(Map.of("styles", styles));
    }
}
