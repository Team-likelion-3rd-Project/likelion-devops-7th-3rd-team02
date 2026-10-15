package com.devflow.ops.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * 운영 상태 조회 설정 (Backend-API-구현-목록 12장 "환경을 여러 개 보는 방법")
 *
 * devflow.ops.current-environment: Backend가 떠 있는 환경 (env 생략 시 기준)
 * devflow.ops.environments[n]: name, label, prometheus-url, namespace
 * devflow.ops.backend-job / backend-deployment: Prometheus job, Deployment 이름
 *
 * Kubernetes 상태(K1, K2, E2, E3)도 Kubernetes API 대신 Prometheus(kube-state-metrics, node-exporter)로 읽는다.
 * Backend에 클러스터 조회 권한(ServiceAccount Role)을 주지 않아도 되고, 환경마다 Prometheus 주소 하나만 있으면 된다.
 */
@ConfigurationProperties(prefix = "devflow.ops")
public record OpsProperties(
        String currentEnvironment,
        String backendJob,
        String backendDeployment,
        String nodeLabel,
        List<Environment> environments
) {

    public OpsProperties {
        currentEnvironment = blankTo(currentEnvironment, "dev");
        backendJob = blankTo(backendJob, "backend");
        backendDeployment = blankTo(backendDeployment, "backend");
        nodeLabel = blankTo(nodeLabel, "node");
        environments = environments == null ? List.of() : List.copyOf(environments);
    }

    public record Environment(
            String name,
            String label,
            String prometheusUrl,
            String namespace
    ) {

        public Environment {
            namespace = blankTo(namespace, "devflow");
            label = blankTo(label, name);
            prometheusUrl = prometheusUrl == null || prometheusUrl.isBlank()
                    ? null
                    : prometheusUrl.trim().replaceAll("/+$", "");
        }

        public boolean hasPrometheus() {
            return prometheusUrl != null;
        }
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
