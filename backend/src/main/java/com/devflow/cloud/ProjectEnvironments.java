package com.devflow.cloud;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.ops.config.CloudEnvironment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 운영 상태 API가 조회할 프로젝트 환경 (Backend-API-구현-목록 14.2)
 * - env 생략: 프로젝트 기본 환경 / 없는 env: 404 ENVIRONMENT_NOT_FOUND / 등록된 환경 없음: 404 CLOUD_NOT_CONNECTED
 */
@Component
@RequiredArgsConstructor
public class ProjectEnvironments {

    private final ProjectCloudEnvironmentRepository repository;
    private final SecretCipher cipher;

    @Transactional(readOnly = true)
    public List<CloudEnvironment> all(Long projectId) {
        return repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId).stream()
                .map(this::toRuntime)
                .toList();
    }

    @Transactional(readOnly = true)
    public CloudEnvironment resolve(Long projectId, String env) {
        List<ProjectCloudEnvironment> environments = repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId);
        if (environments.isEmpty()) {
            throw new BusinessException(ErrorCode.CLOUD_NOT_CONNECTED);
        }
        if (env == null || env.isBlank()) {
            return toRuntime(environments.get(0));
        }
        return environments.stream()
                .filter(e -> e.getName().equals(env.trim()))
                .findFirst()
                .map(this::toRuntime)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENVIRONMENT_NOT_FOUND));
    }

    /** 이름으로 찾기 (D1 health 등, 없으면 empty) */
    @Transactional(readOnly = true)
    public Optional<CloudEnvironment> find(Long projectId, String name) {
        if (name == null) {
            return Optional.empty();
        }
        return repository.findByProjectIdAndName(projectId, name).map(this::toRuntime);
    }

    /** 알림에 devflow_env 라벨이 없을 때 쓸 기본 환경 이름 (없으면 null) */
    @Transactional(readOnly = true)
    public String defaultName(Long projectId) {
        List<ProjectCloudEnvironment> environments = repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId);
        return environments.isEmpty() ? null : environments.get(0).getName();
    }

    /** Prometheus가 필요한 API에서 사용 */
    public static CloudEnvironment requirePrometheus(CloudEnvironment env) {
        if (!env.hasPrometheus()) {
            throw new BusinessException(ErrorCode.CLOUD_NOT_CONNECTED,
                    "'" + env.name() + "' 환경에 Prometheus가 연결되지 않았습니다. 프로젝트 설정에서 연결해 주세요.");
        }
        return env;
    }

    CloudEnvironment toRuntime(ProjectCloudEnvironment e) {
        CloudEnvironment.Aws aws = e.hasAws()
                ? new CloudEnvironment.Aws(e.getAwsRegion(), e.getAwsRoleArn(), e.getAwsExternalId(),
                        e.getAwsRdsInstanceId(), e.getAwsLoadBalancerArn(), e.getAwsTargetGroupArn())
                : null;
        return new CloudEnvironment(
                "env-" + e.getId(),
                e.getProject().getId(),
                e.getName(),
                e.getLabel(),
                e.getPrometheusUrl(),
                cipher.decrypt(e.getPrometheusTokenEnc()),
                e.getNamespace(),
                e.getAppDeployment(),
                e.getMetricsJob(),
                e.getNodeLabel(),
                aws);
    }
}
