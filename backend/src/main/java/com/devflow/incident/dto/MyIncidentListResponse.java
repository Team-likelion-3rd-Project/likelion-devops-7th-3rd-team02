package com.devflow.incident.dto;

import java.util.List;

/** I7 GET /api/users/me/incidents 응답 (FE 요청 2026-10-15) */
public record MyIncidentListResponse(
        long openCount,
        List<IncidentResponse> incidents
) {
}
