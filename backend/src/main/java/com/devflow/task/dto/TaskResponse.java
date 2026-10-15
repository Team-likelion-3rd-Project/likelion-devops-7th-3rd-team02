package com.devflow.task.dto;

import com.devflow.task.entity.Task;
import com.devflow.task.type.TaskStatus;

import java.time.LocalDateTime;

/**
 * 업무 객체 (Backend-API-구현-목록 T2).
 * issue, pullRequest: GitHub 저장소 연동(G1~G3)은 3차 범위에서 제외(2026-10-14)되어 항상 null.
 * 필드는 유지해 나중에 연동을 붙여도 응답 형식이 바뀌지 않게 한다.
 */
public record TaskResponse(
        Long id,
        Long projectId,
        String title,
        String description,
        TaskStatus status,
        Long assigneeId,
        String assigneeName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        IssueLink issue,
        PullRequestLink pullRequest
) {

    public record IssueLink(Integer number, String url) {
    }

    public record PullRequestLink(Integer number, String status, String url) {
    }

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
                task.getUpdatedAt(),
                null,
                null
        );
    }
}
