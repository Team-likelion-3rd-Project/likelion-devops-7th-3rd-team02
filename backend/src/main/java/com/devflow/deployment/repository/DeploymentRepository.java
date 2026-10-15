package com.devflow.deployment.repository;

import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.type.DeploymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeploymentRepository extends JpaRepository<Deployment, Long> {

    Optional<Deployment> findByProjectIdAndPipelineIdAndService(Long projectId, Long pipelineId, String service);

    Page<Deployment> findByProjectId(Long projectId, Pageable pageable);

    Page<Deployment> findByProjectIdAndEnvironment(Long projectId, String environment, Pageable pageable);

    /** E1: 환경의 배포 기록이 있는지 (없으면 NOT_DEPLOYED) */
    boolean existsByProjectIdAndEnvironment(Long projectId, String environment);

    /** E1: 환경에 마지막으로 성공한 배포 (service 기준) */
    Optional<Deployment> findFirstByProjectIdAndEnvironmentAndServiceAndStatusOrderByDeployedAtDescIdDesc(
            Long projectId, String environment, String service, DeploymentStatus status);

    /** E1: service 상관없이 마지막으로 성공한 배포 */
    Optional<Deployment> findFirstByProjectIdAndEnvironmentAndStatusOrderByDeployedAtDescIdDesc(
            Long projectId, String environment, DeploymentStatus status);
}
