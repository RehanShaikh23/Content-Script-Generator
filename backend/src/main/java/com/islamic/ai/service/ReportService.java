package com.islamic.ai.service;

import com.islamic.ai.dto.ReportRequest;
import com.islamic.ai.model.Report;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.ReportRepository;
import com.islamic.ai.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    private static final List<String> VALID_SUBJECTS =
            List.of("Bug", "Feature Request", "Content Issue", "Other");

    private static final int MAX_DESCRIPTION_LENGTH = 2000;

    /**
     * Validate, sanitize, persist, and email a user report.
     *
     * @param request   the incoming report data
     * @param userEmail email extracted from JWT principal
     * @return the saved Report entity
     */
    public Report submitReport(ReportRequest request, String userEmail) {
        // ── Validate ────────────────────────────────────────────
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new IllegalArgumentException("Description is required.");
        }

        String description = sanitize(request.getDescription().trim());
        if (description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException(
                    "Description must be " + MAX_DESCRIPTION_LENGTH + " characters or less.");
        }

        String subject = request.getSubject();
        if (subject == null || !VALID_SUBJECTS.contains(subject)) {
            throw new IllegalArgumentException(
                    "Invalid subject. Must be one of: " + String.join(", ", VALID_SUBJECTS));
        }

        // ── Resolve user ────────────────────────────────────────
        Optional<User> optUser = userRepository.findByEmail(userEmail);
        java.util.UUID userId = optUser.map(User::getId).orElse(null);

        // ── Build & save ────────────────────────────────────────
        Report report = Report.builder()
                .userId(userId)
                .email(userEmail)
                .subject(subject)
                .description(description)
                .screenshotUrl(request.getScreenshotUrl())
                .deviceInfo(sanitize(request.getDeviceInfo()))
                .build();

        Report saved = reportRepository.save(report);
        log.info("Report saved: id={}, subject={}, user={}", saved.getId(), subject, userEmail);

        // ── Send email (async — won't block the response) ──────
        emailService.sendReportEmail(saved);

        return saved;
    }

    /**
     * Strip HTML tags to prevent XSS / injection in stored content.
     */
    private String sanitize(String input) {
        if (input == null) return null;
        return input.replaceAll("<[^>]*>", "").trim();
    }
}
