package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "content_calendars")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContentCalendar {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 200)
    @Builder.Default
    private String name = "My Content Calendar";

    @Column(nullable = false)
    private int duration; // 7, 14, or 30

    @Column(length = 50)
    private String category; // quran, hadith, etc. or "auto_mix"

    @Column(length = 50)
    private String tone;

    @Column(length = 50)
    private String platform; // shorts, reels

    @Column(name = "start_date")
    private OffsetDateTime startDate;

    @Column(name = "timezone", length = 60)
    @Builder.Default
    private String timezone = "UTC";

    /**
     * JSON array of day entries. Each entry:
     * {
     *   "dayNumber": 1,
     *   "date": "2026-05-05",
     *   "topic": "...",
     *   "script": "...",
     *   "caption": "...",
     *   "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4"],
     *   "postingTime": "9:00 AM",
     *   "isPosted": false,
     *   "category": "quran",
     *   "emotionalTone": "Gratitude"
     * }
     */
    @Column(name = "calendar_data", nullable = false, columnDefinition = "TEXT")
    private String calendarData;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
