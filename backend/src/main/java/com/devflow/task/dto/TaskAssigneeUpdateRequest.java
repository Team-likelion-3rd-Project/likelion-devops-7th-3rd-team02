package com.devflow.task.dto;

import jakarta.validation.constraints.NotNull;

public record TaskAssigneeUpdateRequest(

        @NotNull(message = "담당자 ID는 필수입니다.")
        Long assigneeId

) {
}