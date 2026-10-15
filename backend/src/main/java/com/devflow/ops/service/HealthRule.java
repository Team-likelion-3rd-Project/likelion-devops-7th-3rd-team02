package com.devflow.ops.service;

import com.devflow.incident.type.IncidentSeverity;
import com.devflow.ops.dto.OpsDtos;

import java.util.Collection;

/**
 * health 판정 (Backend-API-구현-목록 D1, 12.2). 위에서부터 먼저 맞는 것.
 * DOWN: 준비 레플리카 0 또는 CRITICAL 장애 / DEGRADED: 준비 < 목표 또는 WARNING 장애 / 그 외 HEALTHY
 */
public final class HealthRule {

    public static final String HEALTHY = "HEALTHY";
    public static final String DEGRADED = "DEGRADED";
    public static final String DOWN = "DOWN";
    public static final String UNKNOWN = "UNKNOWN";

    private HealthRule() {
    }

    public static String of(OpsDtos.Replicas replicas, Collection<IncidentSeverity> openIncidents) {
        if (replicas.ready() <= 0 || openIncidents.contains(IncidentSeverity.CRITICAL)) {
            return DOWN;
        }
        if (replicas.ready() < replicas.desired() || openIncidents.contains(IncidentSeverity.WARNING)) {
            return DEGRADED;
        }
        return HEALTHY;
    }
}
