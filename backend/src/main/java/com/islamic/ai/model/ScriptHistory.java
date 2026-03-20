package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "script_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScriptHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String topic;

    @Column(name = "video_format")
    private String videoFormat;

    private String category;
    private String tone;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String script;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
