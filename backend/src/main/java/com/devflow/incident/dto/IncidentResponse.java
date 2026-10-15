package com.devflow.incident.dto;

import com.devflow.global.time.Times;
import com.devflow.incident.entity.Incident;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.incident.type.IncidentStatus;

import java.time.OffsetDateTime;

/** 장애 객체 (Backend-API-구현-목록 I1~I3, I6, I7 공통) */
public record IncidentResponse(
        Long id,
        Long projectId,
        String projectName,
        String title,
        IncidentStatus status,
        IncidentSeverity severity,
        OffsetDateTime occurredAt,
        String source,
        Long assigneeId,
        String summary,
        Metric metric,
        boolean firing,
        OffsetDateTime acknowledgedAt,
        OffsetDateTime resolvedAt
) {

    /** 현재 값·기준 값이 모두 있을 때만 내려준다 (지표가 없는 알림은 null) */
    public record Metric(String name, Double currentValue, Double threshold, String unit) {
    }

    public static IncidentResponse from(Incident incident) {
        Metric metric = incident.getMetricCurrentValue() != null && incident.getMetricThreshold() != null
                ? new Metric(
                        incident.getMetricName(),
                        incident.getMetricCurrentValue(),
                        incident.getMetricThreshold(),
                        incident.getMetricUnit())
                : null;

        return new IncidentResponse(
                incident.getId(),
                incident.getProject().getId(),
                incident.getProject().getName(),
                incident.getTitle(),
                incident.getStatus(),
                incident.getSeverity(),
                Times.toOffset(incident.getOccurredAt()),
                incident.getSource(),
                incident.getAssignee() != null ? incident.getAssignee().getId() : null,
                incident.getSummary(),
                metric,
                incident.isFiring(),
                Times.toOffset(incident.getAcknowledgedAt()),
                Times.toOffset(incident.getResolvedAt())
        );
    }
}
