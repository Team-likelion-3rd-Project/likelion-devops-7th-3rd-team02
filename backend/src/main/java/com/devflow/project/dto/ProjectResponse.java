package com.devflow.project.dto;

import com.devflow.member.type.ProjectRole;
import com.devflow.project.entity.Project;

import java.time.LocalDateTime;

/**
 * 프로젝트 생성·상세 응답. role = 현재 로그인한 사용자의 역할 (Backend-API-구현-목록 P1~P3).
 */
public record ProjectResponse(
        Long id,
        String name,
        String description,
        Long ownerId,
        String ownerName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        ProjectRole role
) {

    public static ProjectResponse of(Project project, ProjectRole role) {
        return new ProjectResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getOwner().getId(),
                project.getOwner().getName(),
                project.getCreatedAt(),
                project.getUpdatedAt(),
                role
        );
    }
}
