package com.islamic.ai.controller;

import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.DodoPaymentsService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dodo")
@RequiredArgsConstructor
public class DodoCheckoutController {

    private static final Logger log = LoggerFactory.getLogger(DodoCheckoutController.class);

    private final DodoPaymentsService dodoPaymentsService;
    private final UserRepository userRepository;

    /**
     * Create a Dodo Payments checkout session for subscription.
     * The frontend calls this, then opens the returned checkoutUrl in the Dodo overlay.
     *
     * POST /api/dodo/checkout-session
     * Body: { "tier": "standard" | "premium" }
     * Response: { "checkoutUrl": "https://checkout.dodopayments.com/session/cks_xxx" }
     */
    @PostMapping("/checkout-session")
    public ResponseEntity<?> createCheckoutSession(@RequestBody Map<String, String> body) {
        String email = getAuthenticatedEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String tier = body.get("tier");
        if (tier == null || (!tier.equals("standard") && !tier.equals("premium"))) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid tier. Must be 'standard' or 'premium'."
            ));
        }

        try {
            String checkoutUrl = dodoPaymentsService.createCheckoutSession(
                    tier, email, user.getFullName()
            );

            log.info("✅ Checkout session created: user={} tier={}", email, tier);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "checkoutUrl", checkoutUrl
            ));

        } catch (Exception e) {
            log.error("❌ Failed to create checkout session for user={}: {}", email, e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Failed to create checkout session. Please try again."
            ));
        }
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
