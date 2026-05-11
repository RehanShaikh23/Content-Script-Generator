package com.islamic.ai.controller;

import com.islamic.ai.security.PremiumOnly;
import com.islamic.ai.service.ExportService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Export endpoints for premium users.
 * Generates PDF and DOCX documents from script text.
 */
@RestController
@RequestMapping("/api/script/export")
@RequiredArgsConstructor
public class ExportController {

    private static final Logger log = LoggerFactory.getLogger(ExportController.class);

    private final ExportService exportService;

    @PostMapping("/pdf")
    @PremiumOnly
    public ResponseEntity<?> exportPdf(@RequestBody Map<String, String> body) {
        try {
            String title = body.getOrDefault("title", "Islamic Script");
            String script = body.get("script");

            if (script == null || script.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Script content is required"));
            }

            byte[] pdf = exportService.generatePdf(title, script);

            log.info("📄 PDF export generated for user={}", getAuthenticatedEmail());

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + sanitizeFilename(title) + ".pdf\"")
                    .body(pdf);
        } catch (Exception e) {
            log.error("PDF export failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate PDF"));
        }
    }

    @PostMapping("/docx")
    @PremiumOnly
    public ResponseEntity<?> exportDocx(@RequestBody Map<String, String> body) {
        try {
            String title = body.getOrDefault("title", "Islamic Script");
            String script = body.get("script");

            if (script == null || script.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Script content is required"));
            }

            byte[] docx = exportService.generateDocx(title, script);

            log.info("📝 DOCX export generated for user={}", getAuthenticatedEmail());

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + sanitizeFilename(title) + ".docx\"")
                    .body(docx);
        } catch (Exception e) {
            log.error("DOCX export failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to generate DOCX"));
        }
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "unknown";
    }

    private String sanitizeFilename(String name) {
        return name.replaceAll("[^a-zA-Z0-9\\-_ ]", "").trim().replace(" ", "_");
    }
}
