package com.islamic.ai.repository;

import com.islamic.ai.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findBySubscriptionId(String subscriptionId);
    long countByDeviceIdHash(String deviceIdHash);
    Optional<User> findByResetToken(String resetToken);

    // ── Admin: search + filter ──────────────────────────────────────
    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:tier IS NULL OR :tier = '' OR u.subscriptionTier = :tier) " +
           "AND (:status IS NULL OR :status = '' OR u.subscriptionStatus = :status)")
    Page<User> searchUsers(@Param("search") String search,
                           @Param("tier") String tier,
                           @Param("status") String status,
                           Pageable pageable);

    // ── Admin: dashboard stats ──────────────────────────────────────
    long countBySubscriptionTier(String tier);
    long countBySubscriptionStatus(String status);
}
