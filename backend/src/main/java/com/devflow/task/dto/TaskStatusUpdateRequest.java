package com.devflow.task.dto;

import com.devflow.task.type.TaskStatus;
import jakarta.validation.constraints.NotNull;

public record TaskStatusUpdateRequest(

        @NotNull(message = "업무 상태는 필수입니다.")
        TaskStatus status

) {
}