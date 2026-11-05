package com.islamic.ai.repository;

import com.islamic.ai.model.VoicePackPurchase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoicePackPurchaseRepository extends JpaRepository<VoicePackPurchase, UUID> {

    /** Prevents duplicate credit grants — payment_id is UNIQUE. */
    boolean existsByPaymentId(String paymentId);

    Optional<VoicePackPurchase> findByPaymentId(String paymentId);

    List<VoicePackPurchase> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
