package com.islamic.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;

@Service
public class PayPalService {

    private static final Logger log = LoggerFactory.getLogger(PayPalService.class);

    @Value("${app.paypal.client-id}")
    private String clientId;

    @Value("${app.paypal.secret}")
    private String secret;

    @Value("${app.paypal.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Verify a subscription is ACTIVE via PayPal Subscriptions API.
     * Returns the subscription details as a JsonNode, or null if verification fails.
     */
    public JsonNode getSubscriptionDetails(String subscriptionId) {
        try {
            String accessToken = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v1/billing/subscriptions/" + subscriptionId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );

            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.error("PayPal subscription verification failed for {}: {}", subscriptionId, e.getMessage());
            return null;
        }
    }

    /**
     * Check if a subscription ID corresponds to an ACTIVE subscription.
     */
    public boolean isSubscriptionActive(String subscriptionId) {
        JsonNode details = getSubscriptionDetails(subscriptionId);
        if (details == null) return false;
        String status = details.path("status").asText("");
        return "ACTIVE".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status);
    }

    /**
     * Get a PayPal OAuth2 access token using client credentials.
     */
    private String getAccessToken() {
        String credentials = Base64.getEncoder()
                .encodeToString((clientId + ":" + secret).getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + credentials);
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl + "/v1/oauth2/token",
                HttpMethod.POST,
                new HttpEntity<>("grant_type=client_credentials", headers),
                String.class
        );

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse PayPal access token response", e);
        }
    }

    /**
     * Cancel a subscription via PayPal Subscriptions API.
     * POST /v1/billing/subscriptions/{id}/cancel
     */
    public boolean cancelSubscription(String subscriptionId, String reason) {
        try {
            String accessToken = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String body = reason != null && !reason.isBlank()
                    ? "{\"reason\":\"" + reason.replace("\"", "'") + "\"}"
                    : "{\"reason\":\"Customer requested cancellation\"}";

            restTemplate.exchange(
                    baseUrl + "/v1/billing/subscriptions/" + subscriptionId + "/cancel",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            log.info("✅ PayPal subscription cancelled: {}", subscriptionId);
            return true;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            // 422 with SUBSCRIPTION_STATUS_INVALID means subscription is already
            // cancelled/expired on PayPal's side — treat as success
            if (e.getStatusCode().value() == 422
                    && e.getResponseBodyAsString().contains("SUBSCRIPTION_STATUS_INVALID")) {
                log.info("✅ PayPal subscription {} already cancelled — proceeding with local update",
                        subscriptionId);
                return true;
            }
            log.error("❌ PayPal subscription cancel failed for {}: {}", subscriptionId, e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("❌ PayPal subscription cancel failed for {}: {}", subscriptionId, e.getMessage());
            return false;
        }
    }

    /**
     * Reactivate a cancelled subscription via PayPal Subscriptions API.
     * POST /v1/billing/subscriptions/{id}/activate
     */
    public boolean reactivateSubscription(String subscriptionId, String reason) {
        try {
            String accessToken = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String body = reason != null && !reason.isBlank()
                    ? "{\"reason\":\"" + reason.replace("\"", "'") + "\"}"
                    : "{\"reason\":\"Customer requested reactivation\"}";

            restTemplate.exchange(
                    baseUrl + "/v1/billing/subscriptions/" + subscriptionId + "/activate",
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    String.class
            );

            log.info("✅ PayPal subscription reactivated: {}", subscriptionId);
            return true;
        } catch (Exception e) {
            log.error("❌ PayPal subscription reactivate failed for {}: {}", subscriptionId, e.getMessage());
            return false;
        }
    }

    /**
     * Get the next billing date (end of current cycle) from PayPal subscription details.
     * Returns the ISO-8601 date string, or null if not available.
     */
    public String getSubscriptionEndDate(String subscriptionId) {
        JsonNode details = getSubscriptionDetails(subscriptionId);
        if (details == null) return null;

        // Try billing_info.next_billing_time first (most reliable for active subscriptions)
        String nextBilling = details.path("billing_info").path("next_billing_time").asText("");
        if (!nextBilling.isEmpty()) return nextBilling;

        // Fallback: check billing_info.final_payment_time for cancelled subscriptions
        String finalPayment = details.path("billing_info").path("final_payment_time").asText("");
        if (!finalPayment.isEmpty()) return finalPayment;

        return null;
    }
}

