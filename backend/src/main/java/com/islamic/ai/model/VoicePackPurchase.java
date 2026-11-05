package com.islamic.ai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Records each ₹800 voice-pack purchase.
 * The payment_id column has a UNIQUE constraint to enforce exactly-once grants.
 */
@Entity
@Table(name = "voice_pack_purchases")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoicePackPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "payment_id", nullable = false, unique = true)
    private String paymentId;

    @Column(name = "product_id", nullable = false)
    private String productId;

    /** Amount in smallest currency unit (paise for INR) */
    @Column(name = "amount_paid", nullable = false)
    private int amountPaid;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "credits_granted", nullable = false)
    @Builder.Default
    private int creditsGranted = 10000;

    /** COMPLETED, REFUNDED */
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "COMPLETED";

    @Column(name = "webhook_id")
    private String webhookId;

    @Column(columnDefinition = "TEXT")
    private String metadata;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = OffsetDateTime.now();
    }
}
