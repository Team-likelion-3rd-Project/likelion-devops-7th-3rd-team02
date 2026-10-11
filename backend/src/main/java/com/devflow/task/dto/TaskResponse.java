package com.devflow.task.dto;

import com.devflow.task.entity.Task;
import com.devflow.task.type.TaskStatus;

import java.time.LocalDateTime;

public record TaskResponse(
        Long id,
        Long projectId,
        String title,
        String description,
        TaskStatus status,
        Long assigneeId,
        String assigneeName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getProject().getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStatus(),
                task.getAssignee() != null
                        ? task.getAssignee().getId()
                        : null,
                task.getAssignee() != null
                        ? task.getAssignee().getName()
                        : null,
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }
}