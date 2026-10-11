package com.devflow.project.dto;

import com.devflow.project.entity.Project;

import java.time.LocalDateTime;

public record ProjectListResponse(
        Long id,
        String name,
        String description,
        Long ownerId,
        String ownerName,
        LocalDateTime createdAt
) {

    public static ProjectListResponse from(Project project) {
        return new ProjectListResponse(
                project.getId(),
                project.getName(),
                project.getDescription(),
                project.getOwner().getId(),
                project.getOwner().getName(),
                project.getCreatedAt()
        );
    }
}