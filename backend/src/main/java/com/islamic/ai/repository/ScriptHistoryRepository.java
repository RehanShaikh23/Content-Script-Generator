package com.islamic.ai.repository;

import com.islamic.ai.model.ScriptHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ScriptHistoryRepository extends JpaRepository<ScriptHistory, UUID> {
    List<ScriptHistory> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<ScriptHistory> findByIdAndUserId(UUID id, UUID userId);
}
