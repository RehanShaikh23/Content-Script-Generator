package com.islamic.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.dto.CalendarGenerateRequest;
import com.islamic.ai.dto.GenerateRequest;
import com.islamic.ai.dto.VisualProfileRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class OpenRouterRoutingTest {
    private final AiModelConfig config = new AiModelConfig(
            "deepseek/deepseek-chat", "test-only-key", "https://openrouter.example/api/v1/chat/completions");

    private MockRestServiceServer expectRequest(Object service, String content) throws Exception {
        var rest = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        assertNotNull(rest);
        var server = MockRestServiceServer.bindTo(rest).build();
        var response = new ObjectMapper().writeValueAsString(Map.of("choices",
                List.of(Map.of("message", Map.of("content", content)))));
        server.expect(requestTo("https://openrouter.example/api/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer test-only-key"))
                .andExpect(header("HTTP-Referer", "https://content-script-generator-lime.vercel.app"))
                .andExpect(jsonPath("$.model").value("deepseek/deepseek-chat"))
                .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        return server;
    }

    @Test
    void scriptsUseSharedOpenRouterDefault() throws Exception {
        var service = new ScriptGenerationService(config, 4096, 8192);
        var server = expectRequest(service, "Test script");
        var request = new GenerateRequest();
        request.setTopic("Gratitude");
        request.setCategory("quran");
        request.setTone("educational");
        request.setVideoFormat("shorts");
        assertEquals("Test script", service.generateScript(request));
        server.verify();
    }

    @Test
    void visualProfilesUseSharedOpenRouterDefault() throws Exception {
        var service = new VisualSceneService(config, new VideoGeneratorCatalog(), 4096);
        var server = expectRequest(service, "{\"style\":\"Test style\"}");
        var request = new VisualProfileRequest();
        request.setTopic("Gratitude");
        assertEquals("Test style", service.generateGlobalProfile(request).get("style"));
        server.verify();
    }

    @Test
    void calendarsUseSharedOpenRouterDefault() throws Exception {
        var service = new CalendarGenerationService(config);
        var server = expectRequest(service, "[{\"dayNumber\":1,\"topic\":\"Gratitude\"}]");
        var request = new CalendarGenerateRequest();
        request.setDuration(1);
        request.setCategory("quran");
        request.setTone("educational");
        request.setPlatform("shorts");
        request.setTimezone("UTC");
        assertEquals("Gratitude", service.generateCalendar(request, false).get(0).get("topic"));
        server.verify();
    }
}
