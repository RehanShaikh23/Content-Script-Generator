package com.islamic.ai.security;

import com.islamic.ai.model.User;
import com.islamic.ai.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Intercepts requests to controller methods annotated with {@link PremiumOnly}.
 * Verifies the authenticated user has an ACTIVE premium subscription.
 * Returns 403 with a JSON error if the user is not premium.
 */
@Component
@RequiredArgsConstructor
public class PremiumAccessInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(PremiumAccessInterceptor.class);

    private final UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {

        // Only intercept actual controller methods
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        // Check if the method has @PremiumOnly annotation
        PremiumOnly premiumOnly = handlerMethod.getMethodAnnotation(PremiumOnly.class);
        if (premiumOnly == null) {
            return true; // Not a premium-only endpoint
        }

        // Get authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Authentication required\"}");
            return false;
        }

        String email = auth.getName();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"User not found\"}");
            return false;
        }

        // Validate premium status — users with CANCELLATION_SCHEDULED still have access
        //   until their billing cycle ends
        boolean isPremium = "premium".equalsIgnoreCase(user.getSubscriptionTier())
                && ("ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus())
                    || "CANCELLATION_SCHEDULED".equalsIgnoreCase(user.getSubscriptionStatus()));

        if (!isPremium) {
            log.info("⛔ Premium access denied for user={} tier={} status={}",
                    email, user.getSubscriptionTier(), user.getSubscriptionStatus());

            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Premium subscription required. Upgrade to access this feature.\"}"
            );
            return false;
        }

        return true; // Premium user — allow access
    }
}
