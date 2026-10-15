package com.devflow.ops.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 운영 상태 응답 (Backend-API-구현-목록 K1, K2, O1, 12장 E1~E3). Frontend types/monitoring.ts와 같은 필드.
 */
public final class OpsDtos {

    private OpsDtos() {
    }

    public record Replicas(int ready, int desired) {
    }

    // K1
    public record K8sDeployment(
            String name,
            int desiredReplicas,
            int availableReplicas,
            int readyReplicas,
            int updatedReplicas
    ) {
    }

    public record K8sDeploymentList(List<K8sDeployment> deployments, OffsetDateTime collectedAt) {
    }

    // K2
    public record K8sPod(
            String name,
            String status,
            int readyContainers,
            int totalContainers,
            int restartCount,
            OffsetDateTime createdAt,
            String image
    ) {
    }

    public record K8sPodList(List<K8sPod> pods, OffsetDateTime collectedAt) {
    }

    // E2
    public record Node(
            String name,
            List<String> roles,
            boolean ready,
            Double cpuUsage,
            Double memoryUsage,
            String kubeletVersion,
            OffsetDateTime createdAt
    ) {
    }

    public record NodeList(List<Node> nodes, OffsetDateTime collectedAt) {
    }

    // E3
    public record Hpa(
            String name,
            String target,
            Integer currentReplicas,
            Integer desiredReplicas,
            Integer minReplicas,
            Integer maxReplicas,
            Integer currentCpuUtilization,
            Integer targetCpuUtilization
    ) {
    }

    public record HpaList(List<Hpa> hpas, OffsetDateTime collectedAt) {
    }

    // O1
    public record MetricPoint(
            OffsetDateTime timestamp,
            double errorRate,
            double responseTimeMs,
            double cpuUsage,
            double memoryUsage
    ) {
    }

    public record MonitoringSummary(
            long httpRequestCount,
            double errorRate,
            double avgResponseTimeMs,
            double cpuUsage,
            double memoryUsage,
            Replicas replicas,
            List<MetricPoint> series,
            OffsetDateTime collectedAt
    ) {
    }

    // E1
    public record EnvironmentSummary(
            String name,
            String label,
            String health,
            String reason,
            String currentImageTag,
            OffsetDateTime lastDeployedAt,
            Replicas replicas,
            long openIncidents,
            OffsetDateTime collectedAt
    ) {
    }
}
