package com.islamic.ai.controller;

import com.islamic.ai.dto.CalendarDayUpdateRequest;
import com.islamic.ai.dto.CalendarGenerateRequest;
import com.islamic.ai.model.ContentCalendar;
import com.islamic.ai.model.User;
import com.islamic.ai.repository.ContentCalendarRepository;
import com.islamic.ai.repository.UserRepository;
import com.islamic.ai.service.CalendarGenerationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.transaction.Transactional;
import java.util.*;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private static final Logger log = LoggerFactory.getLogger(CalendarController.class);

    private final CalendarGenerationService calendarGenerationService;
    private final ContentCalendarRepository calendarRepo;
    private final UserRepository userRepo;
    private final ObjectMapper objectMapper;

    /**
     * Generate a new content calendar.
     * Costs 1 credit per 7 days. Subscription required (standard or premium).
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateCalendar(@RequestBody CalendarGenerateRequest request) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "User not found"));
            }

            // Subscription check — must be standard or premium with ACTIVE status
            if (!isSubscriber(user)) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Content Calendar is available for subscribers only. Please upgrade your plan."
                ));
            }

            // Validate duration
            int duration = request.getDuration();
            if (duration != 7 && duration != 14 && duration != 30) {
                return ResponseEntity.badRequest().body(Map.of("error", "Duration must be 7, 14, or 30 days"));
            }

            // Credit check — 1 credit per 7 days
            boolean isPremium = isPremiumUser(user);
            int creditCost = (int) Math.ceil((double) duration / 7);

            if (!isPremium && user.getCredits() < creditCost) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Not enough credits. Calendar requires " + creditCost + " credit(s). You have " + user.getCredits() + ".",
                        "required", creditCost,
                        "available", user.getCredits()
                ));
            }

            log.info("✦ Generating {}-day calendar for user={}, credits={}", duration, user.getEmail(), creditCost);

            // Generate the calendar
            List<Map<String, Object>> days = calendarGenerationService.generateCalendar(request, isPremium);

            // Deduct credits for non-premium
            if (!isPremium) {
                user.setCredits(user.getCredits() - creditCost);
                userRepo.save(user);
            }

            // Save to database
            String calendarJson = objectMapper.writeValueAsString(days);
            ContentCalendar calendar = ContentCalendar.builder()
                    .userId(user.getId())
                    .name(buildCalendarName(request))
                    .duration(duration)
                    .category(request.getCategory())
                    .tone(request.getTone())
                    .platform(request.getPlatform())
                    .timezone(request.getTimezone() != null ? request.getTimezone() : "UTC")
                    .calendarData(calendarJson)
                    .build();

            calendar = calendarRepo.save(calendar);

            log.info("✅ Calendar saved: id={}, days={}", calendar.getId(), days.size());

            return ResponseEntity.ok(Map.of(
                    "id", calendar.getId(),
                    "name", calendar.getName(),
                    "duration", calendar.getDuration(),
                    "days", days,
                    "remainingCredits", user.getCredits(),
                    "creditCost", creditCost
            ));

        } catch (Exception e) {
            log.error("Calendar generation failed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * List all calendars for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<?> listCalendars() {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            if (!isSubscriber(user)) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Content Calendar is available for subscribers only."
                ));
            }

            List<ContentCalendar> calendars = calendarRepo.findByUserIdOrderByCreatedAtDesc(user.getId());

            // Return summary without full calendar data
            List<Map<String, Object>> summaries = new ArrayList<>();
            for (ContentCalendar cal : calendars) {
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("id", cal.getId());
                summary.put("name", cal.getName());
                summary.put("duration", cal.getDuration());
                summary.put("category", cal.getCategory());
                summary.put("tone", cal.getTone());
                summary.put("platform", cal.getPlatform());
                summary.put("createdAt", cal.getCreatedAt());

                // Count posted days
                try {
                    List<Map<String, Object>> days = objectMapper.readValue(cal.getCalendarData(),
                            new TypeReference<>() {});
                    long postedCount = days.stream()
                            .filter(d -> Boolean.TRUE.equals(d.get("isPosted")))
                            .count();
                    summary.put("totalDays", days.size());
                    summary.put("postedDays", postedCount);
                } catch (Exception e) {
                    summary.put("totalDays", cal.getDuration());
                    summary.put("postedDays", 0);
                }

                summaries.add(summary);
            }

            return ResponseEntity.ok(Map.of("calendars", summaries));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get a specific calendar with full data.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getCalendar(@PathVariable UUID id) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            Optional<ContentCalendar> opt = calendarRepo.findByIdAndUserId(id, user.getId());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Calendar not found"));
            }

            ContentCalendar cal = opt.get();
            List<Map<String, Object>> days = objectMapper.readValue(cal.getCalendarData(),
                    new TypeReference<>() {});

            return ResponseEntity.ok(Map.of(
                    "id", cal.getId(),
                    "name", cal.getName(),
                    "duration", cal.getDuration(),
                    "category", cal.getCategory(),
                    "tone", cal.getTone(),
                    "platform", cal.getPlatform(),
                    "timezone", cal.getTimezone(),
                    "days", days,
                    "createdAt", cal.getCreatedAt()
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update a specific day in a calendar (edit content or mark as posted).
     */
    @PutMapping("/{id}/day/{dayNumber}")
    public ResponseEntity<?> updateDay(@PathVariable UUID id, @PathVariable int dayNumber,
                                        @RequestBody CalendarDayUpdateRequest request) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            Optional<ContentCalendar> opt = calendarRepo.findByIdAndUserId(id, user.getId());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Calendar not found"));
            }

            ContentCalendar cal = opt.get();
            List<Map<String, Object>> days = objectMapper.readValue(cal.getCalendarData(),
                    new TypeReference<>() {});

            // Find and update the day
            boolean found = false;
            for (Map<String, Object> day : days) {
                if ((int) day.get("dayNumber") == dayNumber) {
                    if (request.getTopic() != null) day.put("topic", request.getTopic());
                    if (request.getScript() != null) day.put("script", request.getScript());
                    if (request.getCaption() != null) day.put("caption", request.getCaption());
                    if (request.getHashtags() != null) day.put("hashtags", request.getHashtags());
                    if (request.getPostingTime() != null) day.put("postingTime", request.getPostingTime());
                    if (request.getIsPosted() != null) day.put("isPosted", request.getIsPosted());
                    found = true;
                    break;
                }
            }

            if (!found) {
                return ResponseEntity.status(404).body(Map.of("error", "Day " + dayNumber + " not found"));
            }

            cal.setCalendarData(objectMapper.writeValueAsString(days));
            calendarRepo.save(cal);

            return ResponseEntity.ok(Map.of("success", true, "days", days));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Regenerate content for a specific day.
     */
    @PostMapping("/{id}/day/{dayNumber}/regenerate")
    public ResponseEntity<?> regenerateDay(@PathVariable UUID id, @PathVariable int dayNumber) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            if (!isSubscriber(user)) {
                return ResponseEntity.status(403).body(Map.of("error", "Subscription required"));
            }

            Optional<ContentCalendar> opt = calendarRepo.findByIdAndUserId(id, user.getId());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Calendar not found"));
            }

            ContentCalendar cal = opt.get();
            List<Map<String, Object>> days = objectMapper.readValue(cal.getCalendarData(),
                    new TypeReference<>() {});

            boolean isPremium = isPremiumUser(user);

            // Build request from calendar metadata
            CalendarGenerateRequest genRequest = new CalendarGenerateRequest();
            genRequest.setDuration(cal.getDuration());
            genRequest.setCategory(cal.getCategory());
            genRequest.setTone(cal.getTone());
            genRequest.setPlatform(cal.getPlatform());
            genRequest.setTimezone(cal.getTimezone());

            // Regenerate
            Map<String, Object> newDay = calendarGenerationService.regenerateDay(days, dayNumber, genRequest, isPremium);

            // Replace the day in the list
            for (int i = 0; i < days.size(); i++) {
                if ((int) days.get(i).get("dayNumber") == dayNumber) {
                    // Preserve posted status
                    newDay.put("isPosted", days.get(i).getOrDefault("isPosted", false));
                    newDay.put("date", days.get(i).get("date"));
                    days.set(i, newDay);
                    break;
                }
            }

            cal.setCalendarData(objectMapper.writeValueAsString(days));
            calendarRepo.save(cal);

            return ResponseEntity.ok(Map.of("success", true, "day", newDay, "days", days));

        } catch (Exception e) {
            log.error("Regenerate day failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Delete a calendar.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteCalendar(@PathVariable UUID id) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            Optional<ContentCalendar> opt = calendarRepo.findByIdAndUserId(id, user.getId());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Calendar not found"));
            }

            calendarRepo.deleteByIdAndUserId(id, user.getId());
            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Export calendar as JSON/text download.
     */
    @GetMapping("/{id}/export")
    public ResponseEntity<?> exportCalendar(@PathVariable UUID id) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) return ResponseEntity.status(401).body(Map.of("error", "User not found"));

            Optional<ContentCalendar> opt = calendarRepo.findByIdAndUserId(id, user.getId());
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Calendar not found"));
            }

            ContentCalendar cal = opt.get();
            List<Map<String, Object>> days = objectMapper.readValue(cal.getCalendarData(),
                    new TypeReference<>() {});

            // Build readable text export
            StringBuilder sb = new StringBuilder();
            sb.append("═══════════════════════════════════════\n");
            sb.append("  ISLAMIC CONTENT CALENDAR\n");
            sb.append("  ").append(cal.getName()).append("\n");
            sb.append("  ").append(cal.getDuration()).append(" Days | ").append(cal.getPlatform()).append("\n");
            sb.append("═══════════════════════════════════════\n\n");

            for (Map<String, Object> day : days) {
                sb.append("───────────────────────────────────────\n");
                sb.append("📅 DAY ").append(day.get("dayNumber"));
                sb.append(" | ").append(day.getOrDefault("date", ""));
                if (Boolean.TRUE.equals(day.get("isPosted"))) sb.append(" ✅ POSTED");
                sb.append("\n");
                sb.append("───────────────────────────────────────\n");
                sb.append("Topic: ").append(day.getOrDefault("topic", "")).append("\n\n");
                sb.append("Script:\n").append(day.getOrDefault("script", "")).append("\n\n");
                sb.append("Caption:\n").append(day.getOrDefault("caption", "")).append("\n\n");

                Object hashtags = day.get("hashtags");
                if (hashtags instanceof List) {
                    sb.append("Hashtags: ").append(String.join(" ", (List<String>) hashtags)).append("\n");
                }

                sb.append("Posting Time: ").append(day.getOrDefault("postingTime", "")).append("\n");
                sb.append("Category: ").append(day.getOrDefault("category", "")).append("\n");
                sb.append("\n");
            }

            sb.append("═══════════════════════════════════════\n");
            sb.append("Generated by Islamic Content AI\n");

            return ResponseEntity.ok()
                    .header("Content-Type", "text/plain; charset=UTF-8")
                    .header("Content-Disposition", "attachment; filename=\"" + cal.getName().replaceAll("[^a-zA-Z0-9 ]", "") + ".txt\"")
                    .body(sb.toString());

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Helpers ──

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepo.findByEmail(auth.getName()).orElse(null);
    }

    private boolean isSubscriber(User user) {
        String tier = user.getSubscriptionTier();
        String status = user.getSubscriptionStatus();
        return ("standard".equalsIgnoreCase(tier) || "premium".equalsIgnoreCase(tier))
                && "ACTIVE".equalsIgnoreCase(status);
    }

    private boolean isPremiumUser(User user) {
        return "premium".equalsIgnoreCase(user.getSubscriptionTier())
                && "ACTIVE".equalsIgnoreCase(user.getSubscriptionStatus());
    }

    private String buildCalendarName(CalendarGenerateRequest request) {
        String cat = request.getCategory() != null && !"auto_mix".equals(request.getCategory())
                ? request.getCategory().substring(0, 1).toUpperCase() + request.getCategory().substring(1)
                : "Mixed";
        return cat + " Calendar — " + request.getDuration() + " Days";
    }
}
