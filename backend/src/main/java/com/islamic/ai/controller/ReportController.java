package com.islamic.ai.controller;

import com.islamic.ai.dto.ReportRequest;
import com.islamic.ai.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping("/report")
    public ResponseEntity<?> submitReport(
            @RequestBody ReportRequest request,
            Authentication authentication) {
        try {
            String userEmail = authentication.getName();
            reportService.submitReport(request, userEmail);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Report submitted successfully. JazakAllah Khair."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to submit report. Please try again later."
            ));
        }
    }
}
