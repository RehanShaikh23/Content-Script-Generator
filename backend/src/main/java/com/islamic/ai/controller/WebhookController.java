package com.islamic.ai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Handle PayPal subscription webhook events.
     * PayPal sends POST requests here when subscription status changes
     * (activated, cancelled, suspended, payment completed, etc.)
     */
    @PostMapping("/paypal")
    public ResponseEntity<String> handlePayPalWebhook(@RequestBody String payload) {
        try {
            JsonNode root = objectMapper.readTree(payload);
            String eventType = root.path("event_type").asText("UNKNOWN");
            JsonNode resource = root.path("resource");
            String subscriptionId = resource.path("id").asText("");

            // For PAYMENT.SALE.COMPLETED, the subscription ID is nested differently
            if (subscriptionId.isEmpty() || eventType.startsWith("PAYMENT.SALE")) {
                subscriptionId = resource.path("billing_agreement_id").asText("");
            }

            log.info("📩 PayPal Webhook received: event={} subscriptionId={}", eventType, subscriptionId);

            if (subscriptionId.isEmpty()) {
                log.warn("⚠️ Webhook has no subscription ID, skipping. Event: {}", eventType);
                return ResponseEntity.ok("OK");
            }

            Optional<User> optUser = userRepository.findBySubscriptionId(subscriptionId);
            if (optUser.isEmpty()) {
                log.warn("⚠️ No user found for subscription: {}", subscriptionId);
                return ResponseEntity.ok("OK");
            }

            User user = optUser.get();

            switch (eventType) {
                case "BILLING.SUBSCRIPTION.ACTIVATED":
                    user.setSubscriptionStatus("ACTIVE");
                    log.info("✅ Subscription activated for user={}", user.getEmail());
                    break;

                case "BILLING.SUBSCRIPTION.CANCELLED":
                    // If the user initiated cancellation through our app, they have
                    // CANCELLATION_SCHEDULED status and should keep access until accessEndDate.
                    if ("CANCELLATION_SCHEDULED".equals(user.getSubscriptionStatus())) {
                        log.info("📋 PayPal confirms cancellation for user={}, access continues until {}",
                                user.getEmail(), user.getAccessEndDate());
                        // Status is already CANCELLATION_SCHEDULED — don't downgrade yet
                    } else {
                        // Cancelled outside our app (e.g. directly via PayPal dashboard)
                        user.setSubscriptionStatus("CANCELLED");
                        user.setSubscriptionTier("free");
                        user.setCredits(10);
                        user.setCancellationScheduledAt(null);
                        user.setAccessEndDate(null);
                        user.setCancellationReason(null);
                        log.info("❌ Subscription cancelled externally for user={}", user.getEmail());
                    }
                    break;

                case "BILLING.SUBSCRIPTION.SUSPENDED":
                    user.setSubscriptionStatus("SUSPENDED");
                    log.info("⏸️ Subscription suspended for user={}", user.getEmail());
                    break;

                case "BILLING.SUBSCRIPTION.EXPIRED":
                    user.setSubscriptionStatus("EXPIRED");
                    user.setSubscriptionTier("free");
                    user.setCredits(10);
                    log.info("⏰ Subscription expired for user={}", user.getEmail());
                    break;

                case "PAYMENT.SALE.COMPLETED":
                    // Recurring payment succeeded — auto-reset monthly credits
                    user.setSubscriptionStatus("ACTIVE");
                    if ("standard".equals(user.getSubscriptionTier())) {
                        user.setCredits(50);
                        log.info("🔄 Monthly credits reset to 50 for standard user={}", user.getEmail());
                    } else if ("premium".equals(user.getSubscriptionTier())) {
                        user.setCredits(999999);
                        log.info("🔄 Monthly credits reset (unlimited) for premium user={}", user.getEmail());
                    }
                    break;

                case "PAYMENT.SALE.DENIED":
                case "PAYMENT.SALE.REVERSED":
                    user.setSubscriptionStatus("PAYMENT_FAILED");
                    log.warn("💳 Payment failed/reversed for user={}", user.getEmail());
                    break;

                default:
                    log.info("ℹ️ Unhandled PayPal webhook event: {}", eventType);
            }

            userRepository.save(user);
        } catch (Exception e) {
            log.error("❗ Webhook processing error: {}", e.getMessage(), e);
        }

        // Always return 200 OK to PayPal to prevent retries
        return ResponseEntity.ok("OK");
    }
}
