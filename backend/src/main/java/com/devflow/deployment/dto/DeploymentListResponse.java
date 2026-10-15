package com.devflow.deployment.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** GET /api/projects/{projectId}/deployments 응답 (D1) */
public record DeploymentListResponse(
        List<DeploymentResponse> deployments,
        long totalCount,
        OffsetDateTime collectedAt
) {
}
