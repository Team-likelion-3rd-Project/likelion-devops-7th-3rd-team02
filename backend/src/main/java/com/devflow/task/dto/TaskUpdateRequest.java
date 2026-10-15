package com.devflow.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** PATCH /api/projects/{projectId}/tasks/{taskId} 제목·설명 수정 (Backend-API-구현-목록 T4) */
public record TaskUpdateRequest(

        @NotBlank(message = "업무 제목은 필수입니다.")
        @Size(max = 100, message = "업무 제목은 100자 이하여야 합니다.")
        String title,

        @Size(max = 1000, message = "업무 설명은 1000자 이하여야 합니다.")
        String description

) {

    /** 빈 설명은 null로 저장 */
    public String normalizedDescription() {
        return description == null || description.isBlank() ? null : description;
    }
}
