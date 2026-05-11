package com.islamic.ai.repository;

import com.islamic.ai.model.ContentCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ContentCalendarRepository extends JpaRepository<ContentCalendar, UUID> {

    List<ContentCalendar> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<ContentCalendar> findByIdAndUserId(UUID id, UUID userId);

    void deleteByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);
}
