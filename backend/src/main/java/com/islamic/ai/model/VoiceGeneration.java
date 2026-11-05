package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tracks every ElevenLabs TTS generation job.
 * Status lifecycle:  PENDING → PROCESSING → COMPLETED | FAILED | TIMEOUT
 */
@Entity
@Table(name = "voice_generations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceGeneration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "script_history_id")
    private UUID scriptHistoryId;

    @Column(name = "voice_id", nullable = false, length = 100)
    private String voiceId;

    @Column(name = "model_id", nullable = false, length = 100)
    private String modelId;

    /** PENDING, PROCESSING, COMPLETED, FAILED, TIMEOUT */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "input_text", nullable = false, columnDefinition = "TEXT")
    private String inputText;

    @Column(name = "input_char_count", nullable = false)
    private int inputCharCount;

    @Column(name = "estimated_credits", nullable = false)
    @Builder.Default
    private int estimatedCredits = 0;

    @Column(name = "actual_credits")
    private Integer actualCredits;

    @Column(name = "reserved_credits", nullable = false)
    @Builder.Default
    private int reservedCredits = 0;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "audio_storage_key", length = 500)
    private String audioStorageKey;

    @Column(name = "audio_content_type", length = 50)
    @Builder.Default
    private String audioContentType = "audio/mpeg";

    @Column(name = "audio_size_bytes")
    private Long audioSizeBytes;

    @Column(name = "audio_duration_ms")
    private Long audioDurationMs;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @Column(name = "provider_request_id")
    private String providerRequestId;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (this.createdAt == null) this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
