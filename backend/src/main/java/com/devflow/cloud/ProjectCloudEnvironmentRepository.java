package com.devflow.cloud;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProjectCloudEnvironmentRepository extends JpaRepository<ProjectCloudEnvironment, Long> {

    /** 기본 환경 먼저, 그다음 등록순 */
    List<ProjectCloudEnvironment> findByProjectIdOrderByDefaultEnvironmentDescIdAsc(Long projectId);

    Optional<ProjectCloudEnvironment> findByProjectIdAndName(Long projectId, String name);

    Optional<ProjectCloudEnvironment> findByIdAndProjectId(Long id, Long projectId);

    boolean existsByProjectIdAndName(Long projectId, String name);
}
