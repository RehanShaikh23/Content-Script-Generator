package com.islamic.ai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.DodoPaymentsService;
import com.islamic.ai.service.VoiceCreditService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class DodoWebhookController {

    private static final Logger log = LoggerFactory.getLogger(DodoWebhookController.class);

    private final UserRepository userRepository;
    private final DodoPaymentsService dodoPaymentsService;
    private final VoiceCreditService voiceCreditService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Simple in-memory idempotency set (use Redis in production for multi-instance)
    private final Set<String> processedWebhookIds = ConcurrentHashMap.newKeySet();

    /**
     * Handle Dodo Payments webhook events.
     * Dodo sends POST requests here when subscription/payment status changes.
     *
     * Standard Webhooks headers:
     * - webhook-id: unique event ID
     * - webhook-timestamp: Unix timestamp
     * - webhook-signature: HMAC-SHA256 signature
     */
    @PostMapping("/dodo")
    public ResponseEntity<String> handleDodoWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "webhook-id", required = false) String webhookId,
            @RequestHeader(value = "webhook-timestamp", required = false) String webhookTimestamp,
            @RequestHeader(value = "webhook-signature", required = false) String webhookSignature) {

        // 1. Verify webhook signature
        if (webhookId == null || webhookTimestamp == null || webhookSignature == null) {
            log.warn("⚠️ Dodo webhook missing required headers");
            return ResponseEntity.badRequest().body("Missing webhook headers");
        }

        boolean valid = dodoPaymentsService.verifyWebhookSignature(
                payload, webhookId, webhookTimestamp, webhookSignature
        );

        if (!valid) {
            log.warn("⚠️ Dodo webhook signature verification failed. webhookId={}", webhookId);
            return ResponseEntity.status(401).body("Invalid signature");
        }

        // 2. Idempotency check
        if (processedWebhookIds.contains(webhookId)) {
            log.info("ℹ️ Duplicate Dodo webhook, skipping: {}", webhookId);
            return ResponseEntity.ok("OK");
        }
        processedWebhookIds.add(webhookId);

        // 3. Process the event
        try {
            JsonNode root = objectMapper.readTree(payload);
            String eventType = root.path("type").asText("UNKNOWN");
            JsonNode data = root.path("data");

            log.info("📩 Dodo Webhook received: event={} webhookId={}", eventType, webhookId);

            switch (eventType) {
                case "subscription.active":
                    handleSubscriptionActive(data);
                    break;

                case "subscription.cancelled":
                    handleSubscriptionCancelled(data);
                    break;

                case "subscription.on_hold":
                    handleSubscriptionOnHold(data);
                    break;

                case "subscription.failed":
                    handleSubscriptionFailed(data);
                    break;

                case "subscription.expired":
                    handleSubscriptionExpired(data);
                    break;

                case "payment.succeeded":
                    handlePaymentSucceeded(data);
                    break;

                case "payment.failed":
                    handlePaymentFailed(data);
                    break;

                default:
                    log.info("ℹ️ Unhandled Dodo webhook event: {}", eventType);
            }
        } catch (Exception e) {
            log.error("❗ Dodo webhook processing error: {}", e.getMessage(), e);
        }

        // Always return 200 to prevent retries
        return ResponseEntity.ok("OK");
    }

    /**
     * Subscription activated — user's payment succeeded and subscription is now live.
     */
    private void handleSubscriptionActive(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        String customerEmail = extractCustomerEmail(data);
        String productId = data.path("product_id").asText("");

        if (customerEmail.isEmpty()) {
            log.warn("⚠️ subscription.active: no customer email found");
            return;
        }

        Optional<User> optUser = userRepository.findByEmail(customerEmail);
        if (optUser.isEmpty()) {
            log.warn("⚠️ subscription.active: no user found for email={}", customerEmail);
            return;
        }

        User user = optUser.get();
        String tier = dodoPaymentsService.getProductTier(productId);

        user.setSubscriptionTier(tier);
        user.setSubscriptionId(subscriptionId);
        user.setSubscriptionStatus("ACTIVE");
        user.setPaymentProvider("dodo");
        user.setDodoCustomerId(data.path("customer").path("customer_id").asText(null));

        // Clear any previous cancellation state
        user.setCancellationScheduledAt(null);
        user.setAccessEndDate(null);
        user.setCancellationReason(null);

        // Set credits based on tier
        switch (tier) {
            case "premium":
                user.setCredits(999999); // effectively unlimited
                break;
            case "standard":
                user.setCredits(50);
                break;
            default:
                user.setCredits(10);
        }

        userRepository.save(user);
        log.info("✅ Dodo subscription activated: user={} tier={} subId={}",
                customerEmail, tier, subscriptionId);
    }

    /**
     * Subscription cancelled — either by user or by the system.
     */
    private void handleSubscriptionCancelled(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        String customerEmail = extractCustomerEmail(data);

        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) {
            log.warn("⚠️ subscription.cancelled: no user found for subId={}", subscriptionId);
            return;
        }

        User user = optUser.get();

        // If cancellation was scheduled through our app, keep the state
        if ("CANCELLATION_SCHEDULED".equals(user.getSubscriptionStatus())) {
            log.info("📋 Dodo confirms cancellation for user={}, access continues until {}",
                    user.getEmail(), user.getAccessEndDate());
        } else {
            // Cancelled externally (e.g., via Dodo dashboard)
            user.setSubscriptionStatus("CANCELLED");
            user.setSubscriptionTier("free");
            user.setCredits(10);
            user.setCancellationScheduledAt(null);
            user.setAccessEndDate(null);
            user.setCancellationReason(null);
            log.info("❌ Dodo subscription cancelled externally for user={}", user.getEmail());
        }

        userRepository.save(user);
    }

    /**
     * Subscription on hold — typically a UPI mandate issue.
     */
    private void handleSubscriptionOnHold(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        String customerEmail = extractCustomerEmail(data);

        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) return;

        User user = optUser.get();
        user.setSubscriptionStatus("ON_HOLD");
        userRepository.save(user);
        log.info("⏸️ Dodo subscription on hold: user={}", user.getEmail());
    }

    /**
     * Subscription payment failed.
     */
    private void handleSubscriptionFailed(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        String customerEmail = extractCustomerEmail(data);

        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) return;

        User user = optUser.get();
        user.setSubscriptionStatus("PAYMENT_FAILED");
        userRepository.save(user);
        log.warn("💳 Dodo subscription payment failed: user={}", user.getEmail());
    }

    /**
     * Subscription expired.
     */
    private void handleSubscriptionExpired(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        String customerEmail = extractCustomerEmail(data);

        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) return;

        User user = optUser.get();
        user.setSubscriptionStatus("EXPIRED");
        user.setSubscriptionTier("free");
        user.setCredits(10);
        user.setCancellationScheduledAt(null);
        user.setAccessEndDate(null);
        userRepository.save(user);
        log.info("⏰ Dodo subscription expired: user={}", user.getEmail());
    }

    /**
     * Payment succeeded — could be subscription renewal OR voice pack one-time purchase.
     */
    private void handlePaymentSucceeded(JsonNode data) {
        String paymentId = data.path("payment_id").asText("");
        String productId = data.path("product_id").asText("");
        String subscriptionId = data.path("subscription_id").asText("");

        // Check if this is a voice pack purchase (one-time, no subscription_id)
        if (dodoPaymentsService.isVoicePackProduct(productId)) {
            handleVoicePackPayment(data, paymentId, productId);
            return;
        }

        // Check metadata for product_type = voice_pack
        String productType = data.path("metadata").path("product_type").asText("");
        if ("voice_pack".equals(productType)) {
            handleVoicePackPayment(data, paymentId, productId);
            return;
        }

        if (subscriptionId.isEmpty()) {
            // One-time payment, not subscription and not voice pack — skip
            log.info("ℹ️ Unrecognized one-time payment, skipping: paymentId={} productId={}",
                    paymentId, productId);
            return;
        }

        String customerEmail = extractCustomerEmail(data);
        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) return;

        User user = optUser.get();
        user.setSubscriptionStatus("ACTIVE");

        // Reset monthly credits on renewal
        if ("standard".equals(user.getSubscriptionTier())) {
            user.setCredits(50);
            log.info("🔄 Monthly credits reset to 50 for standard user={}", user.getEmail());
        } else if ("premium".equals(user.getSubscriptionTier())) {
            user.setCredits(999999);
            log.info("🔄 Monthly credits reset (unlimited) for premium user={}", user.getEmail());
        }

        userRepository.save(user);
    }

    /**
     * Handle a voice pack one-time purchase payment.
     * Grants exactly 10,000 voice credits after verifying payment details.
     */
    private void handleVoicePackPayment(JsonNode data, String paymentId, String productId) {
        String customerEmail = extractCustomerEmail(data);

        if (customerEmail.isEmpty()) {
            log.warn("⚠️ Voice pack payment: no customer email. paymentId={}", paymentId);
            return;
        }

        if (paymentId.isEmpty()) {
            log.warn("⚠️ Voice pack payment: no payment_id in webhook data");
            return;
        }

        // Already processed? (idempotent)
        if (voiceCreditService.isPaymentProcessed(paymentId)) {
            log.info("ℹ️ Voice pack payment already processed: paymentId={}", paymentId);
            return;
        }

        Optional<User> optUser = userRepository.findByEmail(customerEmail);
        if (optUser.isEmpty()) {
            log.warn("⚠️ Voice pack payment: no user found for email={}", customerEmail);
            return;
        }

        User user = optUser.get();

        // Extract amount — Dodo sends amounts in smallest currency unit (paisa)
        int amountPaid = data.path("amount").asInt(0);
        if (amountPaid == 0) {
            amountPaid = data.path("total_amount").asInt(0);
        }
        String currency = data.path("currency").asText("INR");

        // Verify expected amount (₹800 = 80000 paisa) and currency
        // Allow some tolerance for fees/rounding but log if unexpected
        if (amountPaid < 79000 || amountPaid > 81000) {
            log.warn("⚠️ Voice pack payment amount unexpected: {} {} (expected ~80000 paisa). paymentId={}",
                    amountPaid, currency, paymentId);
            // Still process — the product ID match is the authority
        }

        String webhookId = data.path("webhook_id").asText("");
        String metadata = data.path("metadata").toString();

        int newBalance = voiceCreditService.grantPurchaseCredits(
                user.getId(), paymentId, productId,
                amountPaid, currency, webhookId, metadata
        );

        if (newBalance >= 0) {
            log.info("✅ Voice pack purchased: user={} paymentId={} newBalance={}",
                    customerEmail, paymentId, newBalance);
        } else {
            log.info("ℹ️ Voice pack payment was duplicate: paymentId={}", paymentId);
        }
    }

    /**
     * Payment failed for a subscription renewal.
     */
    private void handlePaymentFailed(JsonNode data) {
        String subscriptionId = data.path("subscription_id").asText("");
        if (subscriptionId.isEmpty()) return;

        String customerEmail = extractCustomerEmail(data);
        Optional<User> optUser = findUserBySubscriptionOrEmail(subscriptionId, customerEmail);
        if (optUser.isEmpty()) return;

        User user = optUser.get();
        user.setSubscriptionStatus("PAYMENT_FAILED");
        userRepository.save(user);
        log.warn("💳 Dodo payment failed for user={}", user.getEmail());
    }

    // ────────── Helper Methods ──────────

    /**
     * Extract customer email from the webhook data.
     * Tries metadata.user_email first, then customer.email.
     */
    private String extractCustomerEmail(JsonNode data) {
        // Try metadata first (set by us during checkout)
        String email = data.path("metadata").path("user_email").asText("");
        if (!email.isEmpty()) return email;

        // Try customer object
        email = data.path("customer").path("email").asText("");
        if (!email.isEmpty()) return email;

        return "";
    }

    /**
     * Find a user by subscription ID or email.
     */
    private Optional<User> findUserBySubscriptionOrEmail(String subscriptionId, String email) {
        if (!subscriptionId.isEmpty()) {
            Optional<User> bySubId = userRepository.findBySubscriptionId(subscriptionId);
            if (bySubId.isPresent()) return bySubId;
        }
        if (!email.isEmpty()) {
            return userRepository.findByEmail(email);
        }
        return Optional.empty();
    }
}
