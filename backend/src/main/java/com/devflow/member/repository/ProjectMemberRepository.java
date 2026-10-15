package com.devflow.member.repository;

import com.devflow.member.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProjectMemberRepository
        extends JpaRepository<ProjectMember, Long> {

    boolean existsByProjectIdAndUserId(
            Long projectId,
            Long userId
    );

    Optional<ProjectMember> findByProjectIdAndUserId(
            Long projectId,
            Long userId
    );

    List<ProjectMember> findAllByProjectId(
            Long projectId
    );

    List<ProjectMember> findAllByUserId(
            Long userId
    );

    /** 내 프로젝트 목록: 프로젝트·소유자를 한 번에 가져와 N+1을 막는다. 최근 생성순. */
    @Query("""
            select pm from ProjectMember pm
            join fetch pm.project p
            join fetch p.owner
            where pm.user.id = :userId
            order by p.createdAt desc, p.id desc
            """)
    List<ProjectMember> findAllWithProjectByUserId(@Param("userId") Long userId);
}
