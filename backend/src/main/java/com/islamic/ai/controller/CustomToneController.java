package com.islamic.ai.controller;

import com.islamic.ai.model.CustomTone;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.CustomToneRepository;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.security.PremiumOnly;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Manages custom tone presets for premium users.
 */
@RestController
@RequestMapping("/api/tones")
@RequiredArgsConstructor
public class CustomToneController {

    private final CustomToneRepository toneRepo;
    private final UserRepository userRepo;

    /**
     * Get all custom tones for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<?> getCustomTones() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

        List<CustomTone> tones = toneRepo.findByUserIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(tones);
    }

    /**
     * Create a new custom tone (premium only).
     */
    @PostMapping
    @PremiumOnly
    public ResponseEntity<?> createCustomTone(@RequestBody Map<String, String> body) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

        String name = body.get("name");
        String description = body.get("description");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tone name is required"));
        }

        if (name.length() > 50) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tone name must be 50 characters or less"));
        }

        // Limit custom tones to 20 per user
        long count = toneRepo.countByUserId(user.getId());
        if (count >= 20) {
            return ResponseEntity.badRequest().body(Map.of("error", "Maximum of 20 custom tones allowed"));
        }

        CustomTone tone = CustomTone.builder()
                .userId(user.getId())
                .name(name.trim())
                .description(description != null ? description.trim() : "")
                .build();

        toneRepo.save(tone);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "tone", tone
        ));
    }

    /**
     * Delete a custom tone (premium only).
     */
    @DeleteMapping("/{id}")
    @PremiumOnly
    public ResponseEntity<?> deleteCustomTone(@PathVariable UUID id) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

        CustomTone tone = toneRepo.findByIdAndUserId(id, user.getId()).orElse(null);
        if (tone == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Tone not found"));
        }

        toneRepo.delete(tone);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepo.findByEmail(auth.getName()).orElse(null);
    }
}
