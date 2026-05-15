package com.islamic.ai.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.DispatcherType;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final ApiErrorLoggingFilter apiErrorLoggingFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Value("${app.security.require-https:false}")
    private boolean requireHttps;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> {
                headers
                    .contentTypeOptions(cto -> {})                    // X-Content-Type-Options: nosniff
                    .frameOptions(fo -> fo.deny())                    // X-Frame-Options: DENY
                    .cacheControl(cc -> {})                           // Cache-Control: no-cache, no-store
                    .httpStrictTransportSecurity(hsts -> hsts         // Strict-Transport-Security
                        .includeSubDomains(true)
                        .maxAgeInSeconds(31536000)                    // 1 year
                        .preload(true)
                    )
                    .referrerPolicy(rp -> rp                          // Referrer-Policy
                        .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                    )
                    .contentSecurityPolicy(csp -> csp                 // Content-Security-Policy
                        .policyDirectives("default-src 'self'; script-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://cdn.jsdelivr.net https://checkout.dodopayments.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://www.paypalobjects.com https://checkout.dodopayments.com; connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com https://checkout.dodopayments.com https://test.dodopayments.com https://live.dodopayments.com " + allowedOrigins + "; frame-src https://www.paypal.com https://www.sandbox.paypal.com https://checkout.dodopayments.com")
                    );
                // Permissions-Policy (using header writer since .permissionsPolicy() is deprecated for removal)
                headers.addHeaderWriter(
                    new org.springframework.security.web.header.writers.StaticHeadersWriter(
                        "Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)"
                    )
                );
            })
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, res, authEx) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"Session expired. Please log in again.\"}");
                })
                .accessDeniedHandler((req, res, accessEx) -> {
                    res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"Access denied.\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/webhooks/**").permitAll()
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/api/subscription/**").authenticated()
                .anyRequest().authenticated()
            );

        // HTTPS enforcement for production
        if (requireHttps) {
            http.requiresChannel(channel -> channel
                .anyRequest().requiresSecure()
            );
        }

        // Order matters: JWT must run first so SecurityContext is populated
        // before rate limiting checks premium status
        http
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(apiErrorLoggingFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        config.setExposedHeaders(List.of("X-Rate-Limit-Remaining", "Retry-After", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L); // Cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
