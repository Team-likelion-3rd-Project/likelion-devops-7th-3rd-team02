package com.devflow.cloud;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectWebhookTokenRepository extends JpaRepository<ProjectWebhookToken, Long> {

    List<ProjectWebhookToken> findByProjectIdOrderByTypeAsc(Long projectId);

    Optional<ProjectWebhookToken> findByProjectIdAndType(Long projectId, ProjectWebhookToken.Type type);

    Optional<ProjectWebhookToken> findByTokenHashAndType(String tokenHash, ProjectWebhookToken.Type type);
}
