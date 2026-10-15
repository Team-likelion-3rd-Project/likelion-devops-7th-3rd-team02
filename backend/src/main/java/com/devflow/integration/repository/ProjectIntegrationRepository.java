package com.devflow.integration.repository;

import com.devflow.integration.entity.ProjectIntegration;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectIntegrationRepository extends JpaRepository<ProjectIntegration, Long> {

    Optional<ProjectIntegration> findByProjectIdAndProvider(Long projectId, String provider);
}
