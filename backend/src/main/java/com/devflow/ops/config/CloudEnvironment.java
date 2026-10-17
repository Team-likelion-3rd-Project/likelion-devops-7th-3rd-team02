package com.devflow.ops.config;

/**
 * 조회에 쓰는 프로젝트 환경 (Backend-API-구현-목록 14장). DB의 project_cloud_environments에서 만든다.
 * key: 캐시 구분용 고유 값(환경 ID) / prometheusToken: 복호화된 Bearer 토큰(응답·로그에 쓰지 않음)
 */
public record CloudEnvironment(
        String key,
        Long projectId,
        String name,
        String label,
        String prometheusUrl,
        String prometheusToken,
        String namespace,
        String appDeployment,
        String metricsJob,
        String nodeLabel,
        Aws aws
) {

    public boolean hasPrometheus() {
        return prometheusUrl != null && !prometheusUrl.isBlank();
    }

    public boolean hasAws() {
        return aws != null && aws.region() != null && !aws.region().isBlank()
                && aws.roleArn() != null && !aws.roleArn().isBlank();
    }

    /** O1의 Prometheus job (없으면 appDeployment) */
    public String metricsJobOrDefault() {
        return metricsJob != null && !metricsJob.isBlank() ? metricsJob : appDeployment;
    }

    /** 사용자 계정의 읽기 전용 역할을 ExternalId와 함께 AssumeRole 해서 조회 */
    public record Aws(
            String region,
            String roleArn,
            String externalId,
            String rdsInstanceId,
            String loadBalancerArn,
            String targetGroupArn
    ) {
    }
}
