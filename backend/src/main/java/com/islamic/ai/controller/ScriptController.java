package com.islamic.ai.controller;

import com.islamic.ai.dto.GenerateRequest;
import com.islamic.ai.model.ScriptHistory;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.ScriptHistoryRepository;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.ScriptGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/script")
@RequiredArgsConstructor
public class ScriptController {

    private final ScriptGenerationService scriptGenerationService;
    private final ScriptHistoryRepository historyRepo;
    private final UserRepository userRepo;

    @PostMapping("/generate")
    public ResponseEntity<?> generate(@RequestBody GenerateRequest request) {
        try {
            String email = getAuthenticatedEmail();
            User user = userRepo.findByEmail(email).orElse(null);

            // Credit check
            if (user == null) {
                return ResponseEntity.status(401)
                        .body(Map.of("error", "User not found"));
            }
            if (user.getCredits() <= 0) {
                return ResponseEntity.status(403)
                        .body(Map.of("error", "No credits remaining. Please upgrade your plan to continue."));
            }

            String script = scriptGenerationService.generateScript(request);

            // Deduct credit
            user.setCredits(user.getCredits() - 1);
            userRepo.save(user);

            // Save to history
            try {
                ScriptHistory history = ScriptHistory.builder()
                        .userId(user.getId())
                        .topic(request.getTopic())
                        .videoFormat(request.getVideoFormat())
                        .category(request.getCategory())
                        .tone(request.getTone())
                        .script(script)
                        .build();
                historyRepo.save(history);
            } catch (Exception ignored) {
                // Don't fail generation if history save fails
            }

            return ResponseEntity.ok(Map.of(
                    "script", script,
                    "remainingCredits", user.getCredits()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/credits")
    public ResponseEntity<?> getCredits() {
        try {
            String email = getAuthenticatedEmail();
            User user = userRepo.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(Map.of("credits", user.getCredits()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
