package com.islamic.ai.repository;

import com.islamic.ai.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<User> findBySubscriptionId(String subscriptionId);
    long countByDeviceIdHash(String deviceIdHash);
    Optional<User> findByResetToken(String resetToken);
}
