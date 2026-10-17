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
            String namespace,
            Aws aws
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

        /** AWS 환경이면 E4·E5를 AWS API로, 아니면 Prometheus(온프렘 exporter)로 조회 */
        public boolean hasAws() {
            return aws != null && aws.region() != null && !aws.region().isBlank();
        }
    }

    /**
     * AWS 리소스 (E4·E5). 자격 증명은 저장하지 않고 기본 체인(EKS IRSA, EC2 인스턴스 프로파일)을 사용한다.
     * rds-instance-id: RDS 식별자 / load-balancer-arn·target-group-arn: ALB와 대상 그룹
     */
    public record Aws(
            String region,
            String rdsInstanceId,
            String loadBalancerArn,
            String targetGroupArn
    ) {
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
