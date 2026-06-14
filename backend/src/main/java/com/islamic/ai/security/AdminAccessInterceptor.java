package com.islamic.ai.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Intercepts requests to admin endpoints and validates the JWT admin claim.
 * Works with the @AdminOnly annotation on controllers/methods.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminAccessInterceptor implements HandlerInterceptor {

    private final JwtUtil jwtUtil;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Only check annotated handler methods
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        // Check for @AdminOnly on method or class
        boolean adminRequired = handlerMethod.hasMethodAnnotation(AdminOnly.class)
                || handlerMethod.getBeanType().isAnnotationPresent(AdminOnly.class);

        if (!adminRequired) {
            return true;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            sendForbidden(response, "Admin access required");
            return false;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token) || !jwtUtil.isAdmin(token)) {
            log.warn("⚠ Non-admin access attempt to {} from {}",
                    request.getRequestURI(), request.getRemoteAddr());
            sendForbidden(response, "Admin access required");
            return false;
        }

        return true;
    }

    private void sendForbidden(HttpServletResponse response, String message) throws Exception {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
