package com.devflow.cloud;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/** 클라우드 연결 설정 (Backend-API-구현-목록 14.1 CL1~CL5, 14.3 WT1·WT2) */
public final class CloudDtos {

    private CloudDtos() {
    }

    public record EnvironmentRequest(
            @NotBlank(message = "환경 이름은 필수입니다.")
            @Pattern(regexp = "^[a-z0-9][a-z0-9-]{0,29}$", message = "환경 이름은 영문 소문자·숫자·-로 1~30자여야 합니다.")
            String name,

            @Size(max = 50, message = "표시 이름은 50자 이하여야 합니다.")
            String label,

            Boolean isDefault,

            @Valid PrometheusRequest prometheus,
            @Valid KubernetesRequest kubernetes,
            @Valid AwsRequest aws
    ) {
    }

    public record PrometheusRequest(
            @NotBlank(message = "Prometheus 주소는 필수입니다.")
            @Size(max = 300, message = "Prometheus 주소는 300자 이하여야 합니다.")
            String url,

            /** CL3에서 생략하면 기존 값 유지, ""이면 삭제 */
            @Size(max = 500, message = "토큰이 너무 깁니다.")
            String token
    ) {
    }

    public record KubernetesRequest(
            @Size(max = 63) @Pattern(regexp = "^$|^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", message = "네임스페이스 형식이 올바르지 않습니다.")
            String namespace,
            @Size(max = 63) @Pattern(regexp = "^$|^[a-z0-9]([-a-z0-9.]*[a-z0-9])?$", message = "Deployment 이름 형식이 올바르지 않습니다.")
            String appDeployment,
            @Size(max = 100) @Pattern(regexp = "^$|^[A-Za-z0-9_:.-]+$", message = "metricsJob 형식이 올바르지 않습니다.")
            String metricsJob,
            @Size(max = 30) @Pattern(regexp = "^$|^[a-zA-Z_][a-zA-Z0-9_]*$", message = "nodeLabel은 Prometheus 라벨 이름이어야 합니다.")
            String nodeLabel
    ) {
    }

    public record AwsRequest(
            @NotBlank(message = "AWS 리전은 필수입니다.")
            @Pattern(regexp = "^[a-z]{2}(-[a-z]+)+-\\d$", message = "AWS 리전 형식이 올바르지 않습니다.")
            String region,
            @NotBlank(message = "읽기 전용 역할 ARN은 필수입니다.")
            @Pattern(regexp = "^arn:aws[a-z-]*:iam::\\d{12}:role/[\\w+=,.@/-]{1,128}$", message = "역할 ARN 형식이 올바르지 않습니다.")
            String roleArn,
            @Size(max = 100) String rdsInstanceId,
            @Size(max = 300) @Pattern(regexp = "^$|^arn:aws[a-z-]*:elasticloadbalancing:.+:loadbalancer/.+$", message = "로드밸런서 ARN 형식이 올바르지 않습니다.")
            String loadBalancerArn,
            @Size(max = 300) @Pattern(regexp = "^$|^arn:aws[a-z-]*:elasticloadbalancing:.+:targetgroup/.+$", message = "대상 그룹 ARN 형식이 올바르지 않습니다.")
            String targetGroupArn
    ) {
    }

    public record EnvironmentResponse(
            Long id,
            String name,
            String label,
            boolean isDefault,
            Prometheus prometheus,
            Kubernetes kubernetes,
            Aws aws,
            AwsTrust awsTrust,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record Prometheus(String url, boolean hasToken) {
    }

    public record Kubernetes(String namespace, String appDeployment, String metricsJob, String nodeLabel) {
    }

    public record Aws(String region, String roleArn, String rdsInstanceId, String loadBalancerArn, String targetGroupArn) {
    }

    public record AwsTrust(String principalArn, String externalId) {
    }

    public record CheckResult(String status, String message) {

        public static final String OK = "OK";
        public static final String FAILED = "FAILED";
        public static final String NOT_CONFIGURED = "NOT_CONFIGURED";
    }

    public record TestResponse(CheckResult prometheus, CheckResult aws, OffsetDateTime checkedAt) {
    }

    public record WebhookTokenSummary(String type, OffsetDateTime createdAt, OffsetDateTime lastUsedAt) {
    }

    public record WebhookTokenIssued(String type, String token, OffsetDateTime createdAt) {
    }
}
