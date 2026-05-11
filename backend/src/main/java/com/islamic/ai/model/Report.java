package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(length = 255)
    private String email;

    @Column(nullable = false, length = 50)
    private String subject;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(name = "screenshot_url", columnDefinition = "TEXT")
    private String screenshotUrl;

    @Column(name = "device_info", length = 500)
    private String deviceInfo;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
