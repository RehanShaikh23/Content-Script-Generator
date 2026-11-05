package com.islamic.ai.repository;

import com.islamic.ai.model.VoiceGeneration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoiceGenerationRepository extends JpaRepository<VoiceGeneration, UUID> {

    Optional<VoiceGeneration> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    /** Generation history for a user, newest first. */
    List<VoiceGeneration> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Find generations by status (for timeout cleanup jobs). */
    List<VoiceGeneration> findByStatus(String status);

    /** Find a specific generation owned by a user. */
    Optional<VoiceGeneration> findByIdAndUserId(UUID id, UUID userId);
}
