package com.devflow.incident.dto;

import jakarta.validation.constraints.NotNull;

public record IncidentAssigneeUpdateRequest(

        @NotNull(message = "담당자 ID는 필수입니다.")
        Long assigneeId

) {
}
