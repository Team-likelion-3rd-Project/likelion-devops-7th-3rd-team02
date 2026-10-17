package com.devflow.task.dto;

/**
 * PATCH /api/projects/{projectId}/tasks/{taskId}/assignee (T6)
 * assigneeId가 null이면 담당자 해제
 */
public record TaskAssigneeUpdateRequest(

        Long assigneeId

) {
}
