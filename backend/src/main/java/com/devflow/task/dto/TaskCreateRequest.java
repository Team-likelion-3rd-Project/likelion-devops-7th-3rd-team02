package com.devflow.task.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskCreateRequest(

        @NotBlank(message = "업무 제목은 필수입니다.")
        @Size(max = 100, message = "업무 제목은 100자 이하여야 합니다.")
        String title,

        @Size(max = 1000, message = "업무 설명은 1000자 이하여야 합니다.")
        String description,

        Long assigneeId

) {
}