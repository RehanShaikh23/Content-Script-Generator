package com.islamic.ai.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Logs all HTTP responses with 4xx/5xx status codes for API endpoints.
 * Runs after the full filter chain so it can capture the final response status.
 */
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiErrorLoggingFilter extends OncePerRequestFilter {

    private final SecurityAuditLogger auditLogger;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // Let the request proceed through the filter chain
        filterChain.doFilter(request, response);

        // After response is committed, log errors
        int status = response.getStatus();
        String path = request.getRequestURI();

        if (path.startsWith("/api/") && status >= 400) {
            auditLogger.logApiError(status, request.getMethod(), path, request);
        }
    }
}
