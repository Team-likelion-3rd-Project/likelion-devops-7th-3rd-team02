package com.devflow.cloud;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.ops.cloud.AwsCloudClient;
import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.config.CloudProperties;
import com.devflow.ops.prometheus.PrometheusClient;
import com.devflow.project.service.ProjectAccessChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.List;

/** 프로젝트 클라우드 환경 설정 CL1~CL5 (Backend-API-구현-목록 14.1). 변경은 OWNER, 조회는 팀원 */
@Service
@RequiredArgsConstructor
public class ProjectCloudService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ProjectCloudEnvironmentRepository repository;
    private final ProjectAccessChecker access;
    private final ProjectEnvironments environments;
    private final SecretCipher cipher;
    private final CloudTargetGuard guard;
    private final CloudProperties properties;
    private final PrometheusClient prometheus;
    private final AwsCloudClient aws;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<CloudDtos.EnvironmentResponse> list(Long userId, Long projectId) {
        access.checkMember(projectId, userId);
        return repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CloudDtos.EnvironmentResponse create(Long userId, Long projectId, CloudDtos.EnvironmentRequest request) {
        ProjectMember owner = requireOwner(userId, projectId);
        if (repository.existsByProjectIdAndName(projectId, request.name())) {
            throw new BusinessException(ErrorCode.DUPLICATE_ENVIRONMENT);
        }
        ProjectCloudEnvironment environment = new ProjectCloudEnvironment(owner.getProject(), request.name(), newExternalId());
        apply(environment, request, false);

        List<ProjectCloudEnvironment> existing = repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId);
        boolean makeDefault = existing.isEmpty() || Boolean.TRUE.equals(request.isDefault());
        if (makeDefault) {
            existing.forEach(e -> e.markDefault(false));
        }
        environment.markDefault(makeDefault);
        return toResponse(repository.saveAndFlush(environment));
    }

    @Transactional
    public CloudDtos.EnvironmentResponse update(Long userId, Long projectId, Long environmentId, CloudDtos.EnvironmentRequest request) {
        requireOwner(userId, projectId);
        ProjectCloudEnvironment environment = find(projectId, environmentId);
        if (!environment.getName().equals(request.name()) && repository.existsByProjectIdAndName(projectId, request.name())) {
            throw new BusinessException(ErrorCode.DUPLICATE_ENVIRONMENT);
        }
        apply(environment, request, true);

        if (request.isDefault() != null) {
            List<ProjectCloudEnvironment> all = repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId);
            if (request.isDefault()) {
                all.forEach(e -> e.markDefault(e.getId().equals(environment.getId())));
            } else {
                environment.markDefault(false);
                ensureDefault(all);
            }
        }
        return toResponse(repository.saveAndFlush(environment));
    }

    @Transactional
    public void delete(Long userId, Long projectId, Long environmentId) {
        requireOwner(userId, projectId);
        ProjectCloudEnvironment environment = find(projectId, environmentId);
        repository.delete(environment);
        repository.flush();
        ensureDefault(repository.findByProjectIdOrderByDefaultEnvironmentDescIdAsc(projectId));
    }

    /** CL5: 실패해도 200, 결과만 알려 준다 */
    @Transactional(readOnly = true)
    public CloudDtos.TestResponse test(Long userId, Long projectId, Long environmentId) {
        requireOwner(userId, projectId);
        CloudEnvironment env = environments.toRuntime(find(projectId, environmentId));

        CloudDtos.CheckResult promResult;
        if (!env.hasPrometheus()) {
            promResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.NOT_CONFIGURED, null);
        } else {
            try {
                Double targets = prometheus.scalar(env, "count(up)", Duration.ZERO);
                promResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.OK,
                        "Prometheus 응답 정상 (up 대상 " + (targets == null ? 0 : Math.round(targets)) + "개)");
            } catch (BusinessException e) {
                promResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.FAILED, e.getMessage());
            }
        }

        CloudDtos.CheckResult awsResult;
        if (!env.hasAws()) {
            awsResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.NOT_CONFIGURED, null);
        } else {
            try {
                awsResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.OK, aws.verify(env.aws()));
            } catch (BusinessException e) {
                awsResult = new CloudDtos.CheckResult(CloudDtos.CheckResult.FAILED, e.getMessage());
            }
        }
        return new CloudDtos.TestResponse(promResult, awsResult, Times.nowOffset(clock));
    }

    private void apply(ProjectCloudEnvironment environment, CloudDtos.EnvironmentRequest request, boolean updating) {
        environment.rename(request.name(), request.label());

        CloudDtos.PrometheusRequest prom = request.prometheus();
        if (prom == null) {
            environment.connectPrometheus(null, null, false);
        } else {
            String url = guard.check(prom.url());
            boolean keepToken = updating && prom.token() == null;
            String tokenEnc = prom.token() == null || prom.token().isBlank() ? null : cipher.encrypt(prom.token().trim());
            environment.connectPrometheus(url, tokenEnc, keepToken);
        }

        CloudDtos.KubernetesRequest k8s = request.kubernetes();
        if (k8s == null) {
            environment.configureKubernetes(null, null, null, null);
        } else {
            environment.configureKubernetes(k8s.namespace(), k8s.appDeployment(), k8s.metricsJob(), k8s.nodeLabel());
        }

        CloudDtos.AwsRequest awsRequest = request.aws();
        if (awsRequest == null) {
            environment.configureAws(null, null, null, null, null);
        } else {
            environment.configureAws(awsRequest.region(), awsRequest.roleArn(), awsRequest.rdsInstanceId(),
                    awsRequest.loadBalancerArn(), awsRequest.targetGroupArn());
        }
    }

    /** 기본 환경이 하나도 없으면 가장 먼저 등록한 환경을 기본으로 */
    private static void ensureDefault(List<ProjectCloudEnvironment> all) {
        if (!all.isEmpty() && all.stream().noneMatch(ProjectCloudEnvironment::isDefaultEnvironment)) {
            all.stream().min((a, b) -> Long.compare(a.getId(), b.getId())).ifPresent(e -> e.markDefault(true));
        }
    }

    private ProjectMember requireOwner(Long userId, Long projectId) {
        ProjectMember membership = access.getMembership(projectId, userId);
        if (membership.getRole() != ProjectRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return membership;
    }

    private ProjectCloudEnvironment find(Long projectId, Long environmentId) {
        return repository.findByIdAndProjectId(environmentId, projectId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ENVIRONMENT_NOT_FOUND));
    }

    private CloudDtos.EnvironmentResponse toResponse(ProjectCloudEnvironment e) {
        return new CloudDtos.EnvironmentResponse(
                e.getId(),
                e.getName(),
                e.getLabel(),
                e.isDefaultEnvironment(),
                e.getPrometheusUrl() == null ? null
                        : new CloudDtos.Prometheus(e.getPrometheusUrl(), e.getPrometheusTokenEnc() != null),
                new CloudDtos.Kubernetes(e.getNamespace(), e.getAppDeployment(), e.getMetricsJob(), e.getNodeLabel()),
                e.hasAws() ? new CloudDtos.Aws(e.getAwsRegion(), e.getAwsRoleArn(), e.getAwsRdsInstanceId(),
                        e.getAwsLoadBalancerArn(), e.getAwsTargetGroupArn()) : null,
                new CloudDtos.AwsTrust(properties.awsPrincipalArn(), e.getAwsExternalId()),
                Times.toOffset(e.getCreatedAt()),
                Times.toOffset(e.getUpdatedAt()));
    }

    private static String newExternalId() {
        byte[] bytes = new byte[18];
        RANDOM.nextBytes(bytes);
        return "devflow-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
