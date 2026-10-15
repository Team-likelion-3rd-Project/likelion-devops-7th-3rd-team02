package com.devflow.deployment.repository;

import com.devflow.deployment.entity.Deployment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {

    Optional<Deployment> findByProjectIdAndPipelineIdAndService(Long projectId, Long pipelineId, String service);

    Page<Deployment> findByProjectId(Long projectId, Pageable pageable);

    Page<Deployment> findByProjectIdAndEnvironment(Long projectId, String environment, Pageable pageable);
}
