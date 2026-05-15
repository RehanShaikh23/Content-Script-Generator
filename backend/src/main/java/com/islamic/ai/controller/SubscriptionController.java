package com.islamic.ai.controller;

import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.DodoPaymentsService;
import com.islamic.ai.service.EmailService;
import com.islamic.ai.service.PayPalService;
import com.islamic.ai.security.SecurityAuditLogger;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final PayPalService payPalService;
    private final DodoPaymentsService dodoPaymentsService;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SecurityAuditLogger auditLogger;

    /**
     * Activate a subscription after the user completes PayPal checkout.
     * The frontend sends the PayPal subscriptionId and the selected tier.
     * We verify the subscription with PayPal before persisting.
     */
    @PostMapping("/activate")
    public ResponseEntity<?> activateSubscription(@RequestBody Map<String, String> body) {
        String email = getAuthenticatedEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String subscriptionId = body.get("subscriptionId");
        String tier = body.get("tier"); // "standard" or "premium"

        if (subscriptionId == null || tier == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Missing subscriptionId or tier"
            ));
        }

        // Verify with PayPal that this subscription is real & active
        boolean verified = payPalService.isSubscriptionActive(subscriptionId);
        if (!verified) {
            log.warn("Subscription verification failed for user={} subId={}", email, subscriptionId);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Subscription could not be verified with PayPal. Please try again or contact support."
            ));
        }

        // Update user record
        user.setSubscriptionTier(tier);
        user.setSubscriptionId(subscriptionId);
        user.setSubscriptionStatus("ACTIVE");
        user.setPaymentProvider("paypal");

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

        log.info("✅ Subscription activated: user={} tier={} subId={}", email, tier, subscriptionId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "tier", user.getSubscriptionTier(),
                "credits", user.getCredits(),
                "status", user.getSubscriptionStatus()
        ));
    }

    /**
     * Cancel the current user's subscription.
     * Routes to PayPal or Dodo based on the user's payment provider.
     * Access continues until the end of the current billing cycle.
     */
    @PostMapping("/cancel")
    public ResponseEntity<?> cancelSubscription(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        String email = getAuthenticatedEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate: must have an active subscription
        if (user.getSubscriptionId() == null || user.getSubscriptionId().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "No active subscription found"
            ));
        }

        if ("CANCELLATION_SCHEDULED".equals(user.getSubscriptionStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Subscription cancellation is already scheduled"
            ));
        }

        String reason = body.getOrDefault("reason", "");
        String provider = user.getPaymentProvider() != null ? user.getPaymentProvider() : "paypal";

        // Get the end date and cancel via the appropriate provider
        String endDateStr = null;
        boolean cancelled = false;

        if ("dodo".equals(provider)) {
            endDateStr = dodoPaymentsService.getSubscriptionEndDate(user.getSubscriptionId());
            cancelled = dodoPaymentsService.cancelSubscription(user.getSubscriptionId());
        } else {
            // Legacy PayPal path
            endDateStr = payPalService.getSubscriptionEndDate(user.getSubscriptionId());
            cancelled = payPalService.cancelSubscription(user.getSubscriptionId(), reason);
        }

        if (!cancelled) {
            log.error("❌ Cancel API failed for user={} subId={} provider={}",
                    email, user.getSubscriptionId(), provider);
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to cancel subscription. Please try again or contact support."
            ));
        }

        // Determine access end date
        OffsetDateTime accessEndDate;
        if (endDateStr != null && !endDateStr.isBlank()) {
            try {
                accessEndDate = OffsetDateTime.parse(endDateStr);
            } catch (Exception e) {
                // Fallback: 30 days from now
                accessEndDate = OffsetDateTime.now().plusDays(30);
                log.warn("Could not parse end date '{}', defaulting to 30 days", endDateStr);
            }
        } else {
            // Fallback: 30 days from now
            accessEndDate = OffsetDateTime.now().plusDays(30);
        }

        // Update user — keep access until end of billing cycle
        user.setSubscriptionStatus("CANCELLATION_SCHEDULED");
        user.setCancellationScheduledAt(OffsetDateTime.now());
        user.setAccessEndDate(accessEndDate);
        user.setCancellationReason(reason.isBlank() ? null : reason);
        // Do NOT change tier or credits yet — user keeps access until accessEndDate

        userRepository.save(user);

        // Audit log
        auditLogger.logSubscriptionCancellation(email, reason, request);

        // Send confirmation email (async)
        String planName = user.getSubscriptionTier().substring(0, 1).toUpperCase()
                + user.getSubscriptionTier().substring(1);
        String formattedDate = accessEndDate.format(DateTimeFormatter.ofPattern("MMMM d, yyyy"));
        emailService.sendCancellationEmail(email, user.getFullName(), planName, formattedDate);

        log.info("📧 Cancellation scheduled: user={} tier={} accessEndDate={} provider={}",
                email, planName, formattedDate, provider);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("status", "CANCELLATION_SCHEDULED");
        response.put("accessEndDate", accessEndDate.toString());
        response.put("tier", user.getSubscriptionTier());
        response.put("credits", user.getCredits());

        return ResponseEntity.ok(response);
    }

    /**
     * Reactivate a subscription that has been scheduled for cancellation.
     * Only works if the access end date hasn't passed yet.
     * Note: Reactivation is only supported for PayPal subscriptions.
     * For Dodo subscriptions, the user needs to create a new subscription.
     */
    @PostMapping("/reactivate")
    public ResponseEntity<?> reactivateSubscription(HttpServletRequest request) {
        String email = getAuthenticatedEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Validate: must be in cancellation-scheduled state
        if (!"CANCELLATION_SCHEDULED".equals(user.getSubscriptionStatus())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "No pending cancellation to reactivate"
            ));
        }

        // Check that access hasn't expired yet
        if (user.getAccessEndDate() != null && user.getAccessEndDate().isBefore(OffsetDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Subscription has already expired. Please create a new subscription."
            ));
        }

        String provider = user.getPaymentProvider() != null ? user.getPaymentProvider() : "paypal";

        if ("dodo".equals(provider)) {
            // Dodo doesn't support reactivation the same way — user needs to create a new subscription
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Dodo subscriptions cannot be reactivated after cancellation. Please create a new subscription."
            ));
        }

        // Call PayPal to reactivate (legacy path)
        boolean reactivated = payPalService.reactivateSubscription(
                user.getSubscriptionId(),
                "Customer requested reactivation"
        );

        if (!reactivated) {
            log.error("❌ PayPal reactivate API failed for user={} subId={}", email, user.getSubscriptionId());
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to reactivate subscription. Please try again or contact support."
            ));
        }

        // Clear cancellation state
        user.setSubscriptionStatus("ACTIVE");
        user.setCancellationScheduledAt(null);
        user.setAccessEndDate(null);
        user.setCancellationReason(null);

        userRepository.save(user);

        // Audit log
        auditLogger.logSubscriptionReactivation(email, request);

        log.info("✅ Subscription reactivated: user={} tier={}", email, user.getSubscriptionTier());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "status", "ACTIVE",
                "tier", user.getSubscriptionTier(),
                "credits", user.getCredits()
        ));
    }

    /**
     * Get the current user's subscription status.
     */
    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        String email = getAuthenticatedEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> response = new HashMap<>();
        response.put("tier", user.getSubscriptionTier());
        response.put("status", user.getSubscriptionStatus());
        response.put("credits", user.getCredits());
        response.put("subscriptionId", user.getSubscriptionId());
        response.put("paymentProvider", user.getPaymentProvider());

        // Include cancellation details if applicable
        if (user.getAccessEndDate() != null) {
            response.put("accessEndDate", user.getAccessEndDate().toString());
        }
        if (user.getCancellationScheduledAt() != null) {
            response.put("cancellationScheduledAt", user.getCancellationScheduledAt().toString());
        }

        return ResponseEntity.ok(response);
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
