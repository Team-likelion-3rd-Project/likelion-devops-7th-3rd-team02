package com.devflow.project.dto;

import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.entity.Project;

import java.time.LocalDateTime;

/**
 * 프로젝트 목록 항목. 상세(ProjectResponse)와 같은 필드로 맞춘다 (updatedAt, role 추가).
 */
public record ProjectListResponse(
        Long id,
        String name,
        String description,
        Long ownerId,
        String ownerName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        ProjectRole role
) {

    public static ProjectListResponse from(ProjectMember membership) {
        Project project = membership.getProject();
        return new ProjectListResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getOwner().getId(),
                project.getOwner().getName(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                membership.getRole()
        );
    }
}
