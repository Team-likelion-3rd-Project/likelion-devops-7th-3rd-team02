package com.devflow.member.repository;

import com.devflow.member.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectMemberRepository
        extends JpaRepository<ProjectMember, Long> {

    boolean existsByProjectIdAndUserId(
            Long projectId,
            Long userId
    );

    List<ProjectMember> findAllByProjectId(
            Long projectId
    );

    List<ProjectMember> findAllByUserId(
            Long userId
    );
}