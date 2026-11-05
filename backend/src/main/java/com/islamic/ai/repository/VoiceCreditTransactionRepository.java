package com.islamic.ai.repository;

import com.islamic.ai.model.VoiceCreditTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VoiceCreditTransactionRepository extends JpaRepository<VoiceCreditTransaction, UUID> {

    /** Check if a transaction with this idempotency key already exists. */
    boolean existsByIdempotencyKey(String idempotencyKey);

    Optional<VoiceCreditTransaction> findByIdempotencyKey(String idempotencyKey);

    /** Get transaction history for a user, newest first. */
    List<VoiceCreditTransaction> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Find transactions linked to a specific reference (e.g., a generation job). */
    List<VoiceCreditTransaction> findByReferenceTypeAndReferenceId(String referenceType, String referenceId);
}
