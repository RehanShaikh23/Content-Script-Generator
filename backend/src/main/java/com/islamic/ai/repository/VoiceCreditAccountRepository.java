package com.islamic.ai.repository;

import com.islamic.ai.model.VoiceCreditAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VoiceCreditAccountRepository extends JpaRepository<VoiceCreditAccount, UUID> {

    Optional<VoiceCreditAccount> findByUserId(UUID userId);

    /**
     * Pessimistic write lock for atomic balance updates.
     * Prevents concurrent overspending.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM VoiceCreditAccount a WHERE a.userId = :userId")
    Optional<VoiceCreditAccount> findByUserIdForUpdate(@Param("userId") UUID userId);
}
