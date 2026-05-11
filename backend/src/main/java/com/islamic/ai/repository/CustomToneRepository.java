package com.islamic.ai.repository;

import com.islamic.ai.model.CustomTone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomToneRepository extends JpaRepository<CustomTone, UUID> {
    List<CustomTone> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<CustomTone> findByIdAndUserId(UUID id, UUID userId);
    long countByUserId(UUID userId);
}
