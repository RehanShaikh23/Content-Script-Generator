package com.islamic.ai.controller;

import com.islamic.ai.model.User;
import com.islamic.ai.security.AdminOnly;
import com.islamic.ai.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Admin REST API for user management, AI email drafting, and subscription control.
 * All endpoints require admin-level JWT authentication via @AdminOnly.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@AdminOnly
public class AdminController {

    private final AdminService adminService;

    // ── Dashboard Stats ─────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ── User Management ─────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<?> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String status) {

        Page<User> users = adminService.getUsers(page, size, search, tier, status);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("users", users.getContent().stream().map(this::toUserDto).toList());
        response.put("totalElements", users.getTotalElements());
        response.put("totalPages", users.getTotalPages());
        response.put("currentPage", users.getNumber());
        response.put("pageSize", users.getSize());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable UUID id) {
        return adminService.getUserById(id)
                .map(user -> ResponseEntity.ok(toUserDto(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/subscription")
    public ResponseEntity<?> updateSubscription(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {

        String tier = (String) body.get("tier");
        String status = (String) body.get("status");
        Integer credits = body.get("credits") != null ? ((Number) body.get("credits")).intValue() : null;

        try {
            User user = adminService.updateSubscription(id, tier, status, credits);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", toUserDto(user)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PutMapping("/users/{id}/credits")
    public ResponseEntity<?> updateCredits(
            @PathVariable UUID id,
            @RequestBody Map<String, Integer> body) {

        Integer credits = body.get("credits");
        if (credits == null || credits < 0) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Invalid credits value"
            ));
        }

        try {
            User user = adminService.updateCredits(id, credits);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", toUserDto(user)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ── AI Email Drafting ───────────────────────────────────────────

    @PostMapping("/email/draft")
    public ResponseEntity<?> draftEmail(@RequestBody Map<String, String> body) {
        String recipientName = body.get("recipientName");
        String recipientEmail = body.get("recipientEmail");
        String context = body.get("context");
        String tone = body.getOrDefault("tone", "Professional");

        if (context == null || context.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Email context/purpose is required"
            ));
        }

        try {
            String draft = adminService.draftEmail(recipientName, recipientEmail, context, tone);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "draft", draft
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ── Email Sending ───────────────────────────────────────────────

    @PostMapping("/email/send")
    public ResponseEntity<?> sendEmail(@RequestBody Map<String, String> body) {
        String toEmail = body.get("toEmail");
        String toName = body.get("toName");
        String subject = body.get("subject");
        String htmlBody = body.get("htmlBody");

        if (toEmail == null || subject == null || htmlBody == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "toEmail, subject, and htmlBody are required"
            ));
        }

        try {
            adminService.sendEmail(toEmail, toName, subject, htmlBody);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Email sent successfully to " + toEmail
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    // ── DTO Mapper ──────────────────────────────────────────────────

    private Map<String, Object> toUserDto(User user) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", user.getId().toString());
        dto.put("fullName", user.getFullName());
        dto.put("email", user.getEmail());
        dto.put("credits", user.getCredits());
        dto.put("subscriptionTier", user.getSubscriptionTier());
        dto.put("subscriptionStatus", user.getSubscriptionStatus());
        dto.put("paymentProvider", user.getPaymentProvider());
        dto.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        dto.put("accessEndDate", user.getAccessEndDate() != null ? user.getAccessEndDate().toString() : null);
        dto.put("cancellationScheduledAt", user.getCancellationScheduledAt() != null ? user.getCancellationScheduledAt().toString() : null);
        return dto;
    }
}
