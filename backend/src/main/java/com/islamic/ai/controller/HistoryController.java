package com.islamic.ai.controller;

import com.islamic.ai.model.ScriptHistory;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.ScriptHistoryRepository;
import com.islamic.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final ScriptHistoryRepository historyRepo;
    private final UserRepository userRepo;

    @GetMapping
    public ResponseEntity<?> getHistory() {
        String email = getAuthenticatedEmail();
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

        List<ScriptHistory> history = historyRepo.findByUserIdOrderByCreatedAtDesc(user.getId());
        return ResponseEntity.ok(history);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteEntry(@PathVariable UUID id) {
        String email = getAuthenticatedEmail();
        User user = userRepo.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

        // Atomic ownership check — single query ensures the entry belongs to this user
        ScriptHistory entry = historyRepo.findByIdAndUserId(id, user.getId()).orElse(null);
        if (entry == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Not found"));
        }

        historyRepo.delete(entry);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
