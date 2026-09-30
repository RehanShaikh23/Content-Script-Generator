package com.islamic.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.dto.VisualProfileRequest;
import com.islamic.ai.dto.VisualSceneRequest;
import com.islamic.ai.dto.VisualSceneResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI-powered Visual Scene Agent service.
 * Reuses the existing AiModelConfig for provider resolution (same API keys, same providers).
 * Non-streaming — sends one request per scene and expects a JSON response.
 */
@Service
public class VisualSceneService {

    private static final Logger log = LoggerFactory.getLogger(VisualSceneService.class);

    private static final int MAX_SCENE_TEXT_LENGTH = 2000;

    private final AiModelConfig aiModelConfig;
    private final VideoGeneratorCatalog generatorCatalog;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final int visualMaxTokens;

    public VisualSceneService(
            AiModelConfig aiModelConfig,
            VideoGeneratorCatalog generatorCatalog,
            @Value("${app.ai.visual-max-tokens:4096}") int visualMaxTokens) {
        this.aiModelConfig = aiModelConfig;
        this.generatorCatalog = generatorCatalog;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
        this.visualMaxTokens = visualMaxTokens;

        log.info("✦ VisualSceneService initialized (maxTokens={})", visualMaxTokens);
    }

    /**
     * Generate visual direction for a single scene.
     * Uses the configured default NVIDIA model — no premium model selection for visual agent.
     */
    public VisualSceneResponse generateVisualScene(VisualSceneRequest request) {
        // Validate and truncate scene text
        String sceneText = sanitizeSceneText(request.getScriptText());
        if (sceneText.isEmpty()) {
            throw new RuntimeException("Scene text is empty");
        }

        // Resolve AI provider — use default model (no premium routing needed)
        AiModelConfig.ResolvedModel resolved = aiModelConfig.resolve("default", false);

        String systemPrompt = buildVisualAgentSystemPrompt();
        String userPrompt = buildVisualAgentUserPrompt(request, sceneText);

        log.info("🎬 Generating visual direction for scene {} (gen={}, provider={})",
                request.getSceneNumber(), request.getGenerationId(), resolved.provider());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resolved.apiKey());

        if (resolved.provider() == AiModelConfig.Provider.OPENROUTER) {
            headers.set("HTTP-Referer", "https://content-script-generator-lime.vercel.app");
            headers.set("X-Title", "Islamic Script Generator — Visual Agent");
        }

        Map<String, Object> body = Map.of(
                "model", resolved.modelString(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", visualMaxTokens,
                "temperature", 0.5,
                "response_format", Map.of("type", "json_object")
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    resolved.baseUrl(), HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String aiContent = root.path("choices").get(0).path("message").path("content").asText();

            return parseAndBuildResponse(aiContent, request);

        } catch (Exception e) {
            log.error("❌ Visual scene generation failed for scene {}: {}",
                    request.getSceneNumber(), e.getMessage());
            throw new RuntimeException("Visual direction generation failed. Please try again.");
        }
    }

    /**
     * Generate a global visual profile for a script.
     * One AI call per script — provides visual consistency across all scenes.
     */
    public Map<String, String> generateGlobalProfile(VisualProfileRequest request) {
        AiModelConfig.ResolvedModel resolved = aiModelConfig.resolve("default", false);

        String systemPrompt = "You are an AI visual director. "
                + "Given a video script topic and category, generate a global visual style profile "
                + "that ensures visual consistency across all scenes. "
                + "Return ONLY valid JSON with these fields: "
                + "style, visualEra, realismLevel, colorTreatment, cinematicStyle, "
                + "lightingStyle, cameraLanguage, environmentStyle. "
                + "Be specific and practical. Consider the topic context.";

        String userPrompt = String.format(
                "TOPIC: %s\nCATEGORY: %s\nVIDEO FORMAT: %s\nSTYLE PREFERENCE: %s\n\n"
                + "Generate a global visual style profile for this Islamic content video.",
                sanitize(request.getTopic()),
                sanitize(request.getCategory()),
                sanitize(request.getVideoFormat()),
                sanitize(request.getVisualStyle())
        );

        log.info("🎨 Generating global visual profile for topic='{}'", request.getTopic());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(resolved.apiKey());

        if (resolved.provider() == AiModelConfig.Provider.OPENROUTER) {
            headers.set("HTTP-Referer", "https://content-script-generator-lime.vercel.app");
            headers.set("X-Title", "Islamic Script Generator — Visual Profile");
        }

        Map<String, Object> body = Map.of(
                "model", resolved.modelString(),
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "max_tokens", 1024,
                "temperature", 0.4,
                "response_format", Map.of("type", "json_object")
        );

        try {
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    resolved.baseUrl(), HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String aiContent = root.path("choices").get(0).path("message").path("content").asText();

            JsonNode profileNode = objectMapper.readTree(aiContent);
            Map<String, String> profile = new LinkedHashMap<>();
            profile.put("style", getTextOrDefault(profileNode, "style", "Cinematic Documentary"));
            profile.put("visualEra", getTextOrDefault(profileNode, "visualEra", ""));
            profile.put("realismLevel", getTextOrDefault(profileNode, "realismLevel", "photorealistic"));
            profile.put("colorTreatment", getTextOrDefault(profileNode, "colorTreatment", "natural tones"));
            profile.put("cinematicStyle", getTextOrDefault(profileNode, "cinematicStyle", "documentary realism"));
            profile.put("lightingStyle", getTextOrDefault(profileNode, "lightingStyle", "natural lighting"));
            profile.put("cameraLanguage", getTextOrDefault(profileNode, "cameraLanguage", "steady cinematic movement"));
            profile.put("environmentStyle", getTextOrDefault(profileNode, "environmentStyle", "realistic environments"));

            log.info("✅ Global visual profile generated: style='{}'", profile.get("style"));
            return profile;

        } catch (Exception e) {
            log.error("❌ Global profile generation failed: {}", e.getMessage());
            // Return sensible defaults so visual generation can still proceed
            return getDefaultProfile(request.getVisualStyle());
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────

    private String buildVisualAgentSystemPrompt() {
        List<String> generatorIds = generatorCatalog.getAllIds();
        String idsJson = String.join(", ", generatorIds);

        return "You are an AI visual director and video-generation prompt engineer.\n\n"
                + "You receive one scene from a completed script, along with a global visual profile.\n\n"
                + "Your task:\n"
                + "1. Convert the scene into practical visual instructions for AI video generation.\n"
                + "2. Generate search queries for finding reference footage and images.\n"
                + "3. Recommend suitable video generators from the provided catalog IDs only.\n\n"
                + "Rules:\n"
                + "- Do NOT rewrite the script.\n"
                + "- Do NOT add unsupported factual claims.\n"
                + "- Do NOT fabricate historical evidence.\n"
                + "- Focus on what the viewer should see.\n"
                + "- Generate prompts optimized for modern text-to-video models.\n"
                + "- Optimize search queries for visual results, not educational explanations.\n"
                + "- Respect religious, historical, cultural, and contextual sensitivity.\n"
                + "- For religious subjects, avoid visually misleading depictions of sacred figures.\n"
                + "- Maintain consistency with the global visual profile provided.\n"
                + "- For generator recommendations, return ONLY IDs from this list: [" + idsJson + "]\n"
                + "- Adapt the negative prompt specifically to the scene content.\n"
                + "- Return ONLY valid JSON matching the schema below.\n\n"
                + "JSON Schema:\n"
                + "{\n"
                + "  \"sceneNumber\": 1,\n"
                + "  \"visualPrompt\": \"detailed prompt for text-to-video generation\",\n"
                + "  \"negativePrompt\": \"scene-specific negative prompt\",\n"
                + "  \"visualObjective\": \"what the viewer should see and feel\",\n"
                + "  \"visualDirection\": {\n"
                + "    \"subject\": \"\", \"action\": \"\", \"environment\": \"\",\n"
                + "    \"location\": \"\", \"timeOfDay\": \"\", \"mood\": \"\", \"style\": \"\"\n"
                + "  },\n"
                + "  \"camera\": {\n"
                + "    \"shot\": \"\", \"movement\": \"\", \"lens\": \"\", \"composition\": \"\"\n"
                + "  },\n"
                + "  \"lighting\": \"\",\n"
                + "  \"estimatedDuration\": 8,\n"
                + "  \"aspectRatio\": \"16:9\",\n"
                + "  \"recommendedGeneratorIds\": [\"wan21\", \"ltx-video\"],\n"
                + "  \"generatorReasons\": {\"wan21\": \"reason\", \"ltx-video\": \"reason\"},\n"
                + "  \"searchQueries\": {\n"
                + "    \"pinterest\": [\"query1\", \"query2\", \"query3\"],\n"
                + "    \"googleImages\": [\"query1\", \"query2\", \"query3\"],\n"
                + "    \"googleVideo\": [\"query1\", \"query2\"],\n"
                + "    \"youtube\": [\"query1\", \"query2\", \"query3\"],\n"
                + "    \"stockFootage\": [\"query1\", \"query2\", \"query3\"]\n"
                + "  }\n"
                + "}";
    }

    private String buildVisualAgentUserPrompt(VisualSceneRequest request, String sceneText) {
        StringBuilder sb = new StringBuilder();
        sb.append("SCENE NUMBER: ").append(request.getSceneNumber());

        if (request.getSceneTitle() != null && !request.getSceneTitle().isBlank()) {
            sb.append("\nSCENE TITLE: ").append(request.getSceneTitle());
        }

        sb.append("\n\nSCENE NARRATION:\n").append(sceneText);

        // Global visual profile
        if (request.getGlobalVisualProfile() != null) {
            var profile = request.getGlobalVisualProfile();
            sb.append("\n\nGLOBAL VISUAL PROFILE:");
            if (profile.getStyle() != null) sb.append("\nStyle: ").append(profile.getStyle());
            if (profile.getVisualEra() != null) sb.append("\nEra: ").append(profile.getVisualEra());
            if (profile.getRealismLevel() != null) sb.append("\nRealism: ").append(profile.getRealismLevel());
            if (profile.getColorTreatment() != null) sb.append("\nColor: ").append(profile.getColorTreatment());
            if (profile.getCinematicStyle() != null) sb.append("\nCinematic: ").append(profile.getCinematicStyle());
            if (profile.getLightingStyle() != null) sb.append("\nLighting: ").append(profile.getLightingStyle());
            if (profile.getCameraLanguage() != null) sb.append("\nCamera: ").append(profile.getCameraLanguage());
            if (profile.getEnvironmentStyle() != null) sb.append("\nEnvironment: ").append(profile.getEnvironmentStyle());
        }

        // User settings
        if (request.getUserSettings() != null) {
            var settings = request.getUserSettings();
            sb.append("\n\nUSER SETTINGS:");
            sb.append("\nAspect Ratio: ").append(settings.getAspectRatio());
            sb.append("\nTarget Duration: ").append(settings.getDuration()).append(" seconds");
            sb.append("\nGeneration Mode: ").append(settings.getGenerationMode());
        }

        sb.append("\n\nGenerate the complete visual direction for this scene as JSON.");

        return sb.toString();
    }

    /**
     * Parse AI JSON response and build the final VisualSceneResponse.
     * Resolves generator IDs against the verified catalog.
     * Handles malformed JSON gracefully.
     */
    private VisualSceneResponse parseAndBuildResponse(String aiContent, VisualSceneRequest request) {
        try {
            // Strip markdown code fences if present
            String cleanJson = aiContent.trim();
            if (cleanJson.startsWith("```json")) {
                cleanJson = cleanJson.substring(7);
            } else if (cleanJson.startsWith("```")) {
                cleanJson = cleanJson.substring(3);
            }
            if (cleanJson.endsWith("```")) {
                cleanJson = cleanJson.substring(0, cleanJson.length() - 3);
            }
            cleanJson = cleanJson.trim();

            JsonNode ai = objectMapper.readTree(cleanJson);

            // Parse visual direction
            JsonNode vdNode = ai.path("visualDirection");
            VisualSceneResponse.VisualDirection visualDirection = VisualSceneResponse.VisualDirection.builder()
                    .subject(getTextOrDefault(vdNode, "subject", ""))
                    .action(getTextOrDefault(vdNode, "action", ""))
                    .environment(getTextOrDefault(vdNode, "environment", ""))
                    .location(getTextOrDefault(vdNode, "location", ""))
                    .timeOfDay(getTextOrDefault(vdNode, "timeOfDay", ""))
                    .mood(getTextOrDefault(vdNode, "mood", ""))
                    .style(getTextOrDefault(vdNode, "style", ""))
                    .build();

            // Parse camera
            JsonNode camNode = ai.path("camera");
            VisualSceneResponse.Camera camera = VisualSceneResponse.Camera.builder()
                    .shot(getTextOrDefault(camNode, "shot", ""))
                    .movement(getTextOrDefault(camNode, "movement", ""))
                    .lens(getTextOrDefault(camNode, "lens", ""))
                    .composition(getTextOrDefault(camNode, "composition", ""))
                    .build();

            // Resolve generator recommendations from verified catalog
            List<String> genIds = new ArrayList<>();
            JsonNode genIdsNode = ai.path("recommendedGeneratorIds");
            if (genIdsNode.isArray()) {
                genIdsNode.forEach(n -> genIds.add(n.asText()));
            }

            Map<String, String> genReasons = new HashMap<>();
            JsonNode reasonsNode = ai.path("generatorReasons");
            if (reasonsNode.isObject()) {
                reasonsNode.fields().forEachRemaining(e -> genReasons.put(e.getKey(), e.getValue().asText()));
            }

            List<VisualSceneResponse.GeneratorRecommendation> generators =
                    generatorCatalog.resolveRecommendations(genIds, genReasons);

            // Parse search queries
            JsonNode sqNode = ai.path("searchQueries");
            VisualSceneResponse.SearchQueries searchQueries = VisualSceneResponse.SearchQueries.builder()
                    .pinterest(jsonArrayToList(sqNode.path("pinterest")))
                    .googleImages(jsonArrayToList(sqNode.path("googleImages")))
                    .googleVideo(jsonArrayToList(sqNode.path("googleVideo")))
                    .youtube(jsonArrayToList(sqNode.path("youtube")))
                    .stockFootage(jsonArrayToList(sqNode.path("stockFootage")))
                    .build();

            // Determine aspect ratio and duration
            String aspectRatio = getTextOrDefault(ai, "aspectRatio", "16:9");
            int duration = ai.path("estimatedDuration").asInt(8);

            // Override with user settings if provided
            if (request.getUserSettings() != null) {
                if (request.getUserSettings().getAspectRatio() != null) {
                    aspectRatio = request.getUserSettings().getAspectRatio();
                }
                if (request.getUserSettings().getDuration() > 0) {
                    duration = request.getUserSettings().getDuration();
                }
            }

            return VisualSceneResponse.builder()
                    .generationId(request.getGenerationId())
                    .scriptId(request.getScriptId())
                    .sceneId(request.getSceneId())
                    .sceneNumber(request.getSceneNumber())
                    .visualPrompt(getTextOrDefault(ai, "visualPrompt", ""))
                    .negativePrompt(getTextOrDefault(ai, "negativePrompt", ""))
                    .visualObjective(getTextOrDefault(ai, "visualObjective", ""))
                    .visualDirection(visualDirection)
                    .camera(camera)
                    .lighting(getTextOrDefault(ai, "lighting", ""))
                    .estimatedDuration(duration)
                    .aspectRatio(aspectRatio)
                    .generators(generators)
                    .searchQueries(searchQueries)
                    .build();

        } catch (Exception e) {
            log.error("❌ Failed to parse AI visual response for scene {}: {}",
                    request.getSceneNumber(), e.getMessage());
            throw new RuntimeException("Invalid visual direction response from AI. Please try again.");
        }
    }

    private String sanitizeSceneText(String text) {
        if (text == null) return "";
        String sanitized = text.trim();
        if (sanitized.length() > MAX_SCENE_TEXT_LENGTH) {
            sanitized = sanitized.substring(0, MAX_SCENE_TEXT_LENGTH);
        }
        return sanitized;
    }

    private String sanitize(String value) {
        if (value == null) return "";
        return value.trim();
    }

    private String getTextOrDefault(JsonNode node, String field, String defaultValue) {
        if (node == null || node.isMissingNode()) return defaultValue;
        JsonNode child = node.path(field);
        if (child.isMissingNode() || child.isNull()) return defaultValue;
        return child.asText(defaultValue);
    }

    private List<String> jsonArrayToList(JsonNode arrayNode) {
        List<String> list = new ArrayList<>();
        if (arrayNode != null && arrayNode.isArray()) {
            arrayNode.forEach(n -> {
                String text = n.asText("").trim();
                if (!text.isEmpty()) list.add(text);
            });
        }
        return list;
    }

    private Map<String, String> getDefaultProfile(String visualStyle) {
        Map<String, String> defaults = new LinkedHashMap<>();
        String style = (visualStyle != null && !visualStyle.isBlank())
                ? visualStyle.replace('_', ' ')
                : "Cinematic Documentary";
        defaults.put("style", style);
        defaults.put("visualEra", "");
        defaults.put("realismLevel", "photorealistic");
        defaults.put("colorTreatment", "natural tones");
        defaults.put("cinematicStyle", "documentary realism");
        defaults.put("lightingStyle", "natural lighting");
        defaults.put("cameraLanguage", "steady cinematic movement");
        defaults.put("environmentStyle", "realistic environments");
        return defaults;
    }
}
