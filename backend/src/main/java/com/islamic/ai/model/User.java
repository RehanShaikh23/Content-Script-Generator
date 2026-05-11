package com.islamic.ai.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @JsonIgnore
    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    @Builder.Default
    private int credits = 10;

    @Column(name = "subscription_tier", length = 20)
    @Builder.Default
    private String subscriptionTier = "free";

    @Column(name = "subscription_id", length = 100)
    private String subscriptionId;

    @Column(name = "subscription_status", length = 30)
    @Builder.Default
    private String subscriptionStatus = "NONE";

    @Column(name = "cancellation_scheduled_at")
    private OffsetDateTime cancellationScheduledAt;

    @Column(name = "access_end_date")
    private OffsetDateTime accessEndDate;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "device_id_hash", length = 64)
    private String deviceIdHash;

    @Column(name = "reset_token", length = 64)
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private OffsetDateTime resetTokenExpiry;

    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
    }
}
