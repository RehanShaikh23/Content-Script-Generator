package com.islamic.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * Service layer for all admin operations:
 *  - User listing with search/filter/pagination
 *  - Subscription management (upgrade/downgrade/cancel)
 *  - AI-powered email drafting via OpenRouter (Gemini)
 *  - Email sending via Twilio SendGrid
 *  - Dashboard statistics
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.ai.openrouter-api-key:}")
    private String openrouterApiKey;

    @Value("${app.ai.openrouter-base-url:https://openrouter.ai/api/v1/chat/completions}")
    private String openrouterBaseUrl;

    @Value("${app.admin.sendgrid-api-key:}")
    private String sendgridApiKey;

    @Value("${app.admin.sendgrid-from-email:noreply@islamicscriptgenerator.com}")
    private String sendgridFromEmail;

    @Value("${app.admin.sendgrid-from-name:Islamic Script Generator}")
    private String sendgridFromName;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    // ── User Management ─────────────────────────────────────────────

    public Page<User> getUsers(int page, int size, String search, String tier, String status) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return userRepository.searchUsers(
                search != null && search.isBlank() ? null : search,
                tier != null && tier.isBlank() ? null : tier,
                status != null && status.isBlank() ? null : status,
                pageRequest
        );
    }

    public Optional<User> getUserById(UUID id) {
        return userRepository.findById(id);
    }

    public User updateSubscription(UUID userId, String tier, String status, Integer credits) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (tier != null && !tier.isBlank()) {
            user.setSubscriptionTier(tier);
        }
        if (status != null && !status.isBlank()) {
            user.setSubscriptionStatus(status);
        }
        if (credits != null) {
            user.setCredits(credits);
        }

        // If upgrading to premium, set unlimited credits
        if ("premium".equals(tier) && "ACTIVE".equals(status)) {
            user.setCredits(999999);
            user.setCancellationScheduledAt(null);
            user.setAccessEndDate(null);
            user.setCancellationReason(null);
        }

        // If downgrading to free
        if ("free".equals(tier)) {
            user.setSubscriptionStatus("NONE");
            user.setSubscriptionId(null);
            user.setCancellationScheduledAt(null);
            user.setAccessEndDate(null);
            user.setCancellationReason(null);
            if (credits == null) user.setCredits(10);
        }

        userRepository.save(user);
        log.info("✦ Admin updated subscription: userId={} tier={} status={} credits={}",
                userId, user.getSubscriptionTier(), user.getSubscriptionStatus(), user.getCredits());
        return user;
    }

    public User updateCredits(UUID userId, int credits) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setCredits(credits);
        userRepository.save(user);
        log.info("✦ Admin set credits: userId={} credits={}", userId, credits);
        return user;
    }

    // ── Dashboard Stats ─────────────────────────────────────────────

    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("premiumUsers", userRepository.countBySubscriptionTier("premium"));
        stats.put("freeUsers", userRepository.countBySubscriptionTier("free"));
        stats.put("activeSubscriptions", userRepository.countBySubscriptionStatus("ACTIVE"));
        stats.put("cancellingSubscriptions", userRepository.countBySubscriptionStatus("CANCELLATION_SCHEDULED"));
        return stats;
    }

    // ── AI Email Drafting (OpenRouter / Gemini) ─────────────────────

    public String draftEmail(String recipientName, String recipientEmail, String context, String tone) {
        if (openrouterApiKey == null || openrouterApiKey.isBlank()) {
            throw new RuntimeException("OpenRouter API key not configured");
        }

        String systemPrompt = """
                You are an expert email copywriter for "Islamic Script Generator", a SaaS platform that helps 
                Muslim content creators generate scripts for YouTube, TikTok, and other platforms.
                
                Write a professional, compelling email based on the given context and tone.
                The email should:
                - Be well-structured with a clear subject line, greeting, body, and sign-off
                - Use appropriate Islamic greetings (Assalamu Alaikum)
                - Be concise but impactful
                - Match the requested tone
                - Include a clear call-to-action if applicable
                
                Return the email in this exact format:
                SUBJECT: [subject line here]
                ---
                [email body in HTML format with inline styles, keep it clean and professional]
                """;

        String userPrompt = String.format(
                "Recipient: %s (%s)\nContext/Purpose: %s\nTone: %s\n\nDraft the email now.",
                recipientName, recipientEmail, context, tone
        );

        try {
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("model", "google/gemini-2.0-flash-001");
            requestBody.put("max_tokens", 2048);

            ArrayNode messages = requestBody.putArray("messages");

            ObjectNode sysMsg = messages.addObject();
            sysMsg.put("role", "system");
            sysMsg.put("content", systemPrompt);

            ObjectNode userMsg = messages.addObject();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(openrouterBaseUrl))
                    .header("Authorization", "Bearer " + openrouterApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                log.error("OpenRouter API error ({}): {}", response.statusCode(), response.body());
                throw new RuntimeException("AI service error: " + response.statusCode());
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            String content = responseJson.path("choices").path(0).path("message").path("content").asText();

            if (content == null || content.isBlank()) {
                throw new RuntimeException("AI returned empty response");
            }

            return content;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to draft email via AI: {}", e.getMessage());
            throw new RuntimeException("Failed to generate email draft: " + e.getMessage());
        }
    }

    // ── Email Sending (Twilio SendGrid) ─────────────────────────────

    public void sendEmail(String toEmail, String toName, String subject, String htmlBody) {
        if (sendgridApiKey == null || sendgridApiKey.isBlank()) {
            throw new RuntimeException("SendGrid API key not configured. Set SENDGRID_API_KEY in environment.");
        }

        try {
            ObjectNode payload = objectMapper.createObjectNode();

            // Personalizations
            ArrayNode personalizations = payload.putArray("personalizations");
            ObjectNode personalization = personalizations.addObject();
            ArrayNode toArray = personalization.putArray("to");
            ObjectNode toObj = toArray.addObject();
            toObj.put("email", toEmail);
            if (toName != null && !toName.isBlank()) {
                toObj.put("name", toName);
            }

            // From
            ObjectNode from = payload.putObject("from");
            from.put("email", sendgridFromEmail);
            from.put("name", sendgridFromName);

            // Subject
            payload.put("subject", subject);

            // Content
            ArrayNode content = payload.putArray("content");
            ObjectNode htmlContent = content.addObject();
            htmlContent.put("type", "text/html");
            htmlContent.put("value", htmlBody);

            String json = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.sendgrid.com/v3/mail/send"))
                    .header("Authorization", "Bearer " + sendgridApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                log.error("SendGrid API error ({}): {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to send email via SendGrid: " + response.statusCode());
            }

            log.info("✅ Admin email sent via SendGrid to {} ({})", toEmail, subject);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to send email via SendGrid: {}", e.getMessage());
            throw new RuntimeException("Email sending failed: " + e.getMessage());
        }
    }
}
