package com.islamic.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
public class DodoPaymentsService {

    private static final Logger log = LoggerFactory.getLogger(DodoPaymentsService.class);

    @Value("${app.dodo.api-key}")
    private String apiKey;

    @Value("${app.dodo.webhook-secret}")
    private String webhookSecret;

    @Value("${app.dodo.base-url}")
    private String baseUrl;

    @Value("${app.dodo.standard-product-id}")
    private String standardProductId;

    @Value("${app.dodo.premium-product-id}")
    private String premiumProductId;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Create a Dodo Payments checkout session for a subscription product.
     * Returns the checkout URL that the frontend will open in the overlay.
     */
    public String createCheckoutSession(String tier, String customerEmail, String customerName) {
        try {
            String productId = "premium".equals(tier) ? premiumProductId : standardProductId;

            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Build the checkout session payload
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("payment_link", false);

            // Product cart — single subscription item
            ArrayNode items = objectMapper.createArrayNode();
            ObjectNode item = objectMapper.createObjectNode();
            item.put("product_id", productId);
            item.put("quantity", 1);
            items.add(item);
            payload.set("product_cart", items);

            // Customer details
            ObjectNode customer = objectMapper.createObjectNode();
            customer.put("email", customerEmail);
            if (customerName != null && !customerName.isBlank()) {
                customer.put("name", customerName);
            }
            payload.set("customer", customer);

            // Billing country for UPI
            payload.put("billing_country", "IN");

            // Metadata for webhook correlation
            ObjectNode metadata = objectMapper.createObjectNode();
            metadata.put("user_email", customerEmail);
            metadata.put("tier", tier);
            payload.set("metadata", metadata);

            // Success and failure URLs
            payload.put("success_url", frontendUrl + "?subscription=success&tier=" + tier);
            payload.put("failure_url", frontendUrl + "?subscription=failed");

            log.info("🔵 Creating Dodo checkout session: tier={} email={} productId={}",
                    tier, customerEmail, productId);

            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/checkout-sessions",
                    HttpMethod.POST,
                    new HttpEntity<>(payload.toString(), headers),
                    String.class
            );

            JsonNode responseBody = objectMapper.readTree(response.getBody());
            String checkoutUrl = responseBody.path("checkout_url").asText("");

            if (checkoutUrl.isEmpty()) {
                log.error("❌ Dodo checkout session response missing checkout_url: {}",
                        response.getBody());
                throw new RuntimeException("Checkout URL not found in Dodo response");
            }

            log.info("✅ Dodo checkout session created: url={}", checkoutUrl);
            return checkoutUrl;

        } catch (Exception e) {
            log.error("❌ Failed to create Dodo checkout session: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create checkout session: " + e.getMessage(), e);
        }
    }

    /**
     * Get subscription details from Dodo Payments API.
     */
    public JsonNode getSubscriptionDetails(String subscriptionId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/subscriptions/" + subscriptionId,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );

            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            log.error("❌ Failed to get Dodo subscription details for {}: {}",
                    subscriptionId, e.getMessage());
            return null;
        }
    }

    /**
     * Check if a Dodo subscription is active.
     */
    public boolean isSubscriptionActive(String subscriptionId) {
        JsonNode details = getSubscriptionDetails(subscriptionId);
        if (details == null) return false;
        String status = details.path("status").asText("");
        return "active".equalsIgnoreCase(status);
    }

    /**
     * Cancel a Dodo subscription.
     * PATCH /subscriptions/{id} with status: "cancelled"
     */
    public boolean cancelSubscription(String subscriptionId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            ObjectNode body = objectMapper.createObjectNode();
            body.put("status", "cancelled");

            restTemplate.exchange(
                    baseUrl + "/subscriptions/" + subscriptionId,
                    HttpMethod.PATCH,
                    new HttpEntity<>(body.toString(), headers),
                    String.class
            );

            log.info("✅ Dodo subscription cancelled: {}", subscriptionId);
            return true;
        } catch (Exception e) {
            log.error("❌ Failed to cancel Dodo subscription {}: {}",
                    subscriptionId, e.getMessage());
            return false;
        }
    }

    /**
     * Get the next billing date from a Dodo subscription.
     */
    public String getSubscriptionEndDate(String subscriptionId) {
        JsonNode details = getSubscriptionDetails(subscriptionId);
        if (details == null) return null;

        String nextBilling = details.path("next_billing_date").asText("");
        if (!nextBilling.isEmpty()) return nextBilling;

        String currentPeriodEnd = details.path("current_period_end").asText("");
        if (!currentPeriodEnd.isEmpty()) return currentPeriodEnd;

        return null;
    }

    /**
     * Verify webhook signature using the Standard Webhooks specification.
     * 
     * The signed message is: "{webhook-id}.{webhook-timestamp}.{body}"
     * HMAC-SHA256 with the webhook secret (base64-decoded, stripping "whsec_" prefix).
     */
    public boolean verifyWebhookSignature(String payload, String webhookId,
                                           String webhookTimestamp, String webhookSignature) {
        try {
            // Strip "whsec_" prefix and decode the secret
            String secretKey = webhookSecret;
            if (secretKey.startsWith("whsec_")) {
                secretKey = secretKey.substring(6);
            }
            byte[] secretBytes = Base64.getDecoder().decode(secretKey);

            // Build the signed message: "{id}.{timestamp}.{body}"
            String signedMessage = webhookId + "." + webhookTimestamp + "." + payload;

            // Compute HMAC-SHA256
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] hash = mac.doFinal(signedMessage.getBytes(StandardCharsets.UTF_8));
            String expectedSignature = "v1," + Base64.getEncoder().encodeToString(hash);

            // The webhook-signature header may contain multiple signatures separated by spaces
            // Check if any of them match
            for (String sig : webhookSignature.split(" ")) {
                if (sig.equals(expectedSignature)) {
                    return true;
                }
            }

            log.warn("⚠️ Webhook signature mismatch. Expected={}, Got={}",
                    expectedSignature, webhookSignature);
            return false;

        } catch (Exception e) {
            log.error("❌ Webhook signature verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Map a Dodo product ID to a subscription tier name.
     */
    public String getProductTier(String productId) {
        if (premiumProductId.equals(productId)) return "premium";
        if (standardProductId.equals(productId)) return "standard";
        return "free";
    }
}
