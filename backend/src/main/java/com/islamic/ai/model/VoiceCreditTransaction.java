package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Immutable ledger entry for every voice-credit mutation.
 * Never update or delete rows — append only.
 */
@Entity
@Table(name = "voice_credit_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoiceCreditTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** PURCHASE, RESERVATION, DEDUCTION, RELEASE, REFUND, SETTLEMENT */
    @Column(nullable = false, length = 30)
    private String type;

    /** Positive = credits in, Negative = credits out */
    @Column(nullable = false)
    private int amount;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id")
    private String referenceId;

    @Column(length = 500)
    private String description;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = OffsetDateTime.now();
    }
}
