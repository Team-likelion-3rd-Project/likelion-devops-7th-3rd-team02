package com.devflow.auth.oauth;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserIdentity> findByProviderAndProviderUserId(String provider, String providerUserId);

    Optional<UserIdentity> findByUserIdAndProvider(Long userId, String provider);
}
