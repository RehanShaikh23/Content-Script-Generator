package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tracks the voice-credit balance for a single user.
 * One row per user.  Every mutation goes through VoiceCreditService
 * which also writes an immutable VoiceCreditTransaction row.
 */
@Entity
@Table(name = "voice_credit_accounts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceCreditAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(nullable = false)
    @Builder.Default
    private int balance = 0;

    @Column(name = "total_purchased", nullable = false)
    @Builder.Default
    private int totalPurchased = 0;

    @Column(name = "total_used", nullable = false)
    @Builder.Default
    private int totalUsed = 0;

    @Column(name = "total_refunded", nullable = false)
    @Builder.Default
    private int totalRefunded = 0;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
