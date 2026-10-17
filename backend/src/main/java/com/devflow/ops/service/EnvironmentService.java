package com.devflow.ops.service;

import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.repository.DeploymentRepository;
import com.devflow.deployment.type.DeploymentStatus;
import com.devflow.global.external.ExternalApiException;
import com.devflow.global.external.ExternalCache;
import com.devflow.global.time.Times;
import com.devflow.incident.repository.IncidentRepository;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.cloud.ProjectEnvironments;
import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.dto.OpsDtos;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * E1 환경 목록·요약 (Backend-API-구현-목록 12.2).
 * 설정된 환경을 항상 모두 돌려주고(200), 못 가져온 환경은 health=UNKNOWN + reason으로 구분한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnvironmentService {

    public static final String REASON_UNREACHABLE = "UNREACHABLE";
    public static final String REASON_NOT_DEPLOYED = "NOT_DEPLOYED";
    public static final String REASON_NOT_CONNECTED = "NOT_CONNECTED";
    private static final Duration LAST_SUCCESS_TTL = Duration.ofDays(7);

    private final ProjectEnvironments environments;
    private final KubeStatusService kubeStatus;
    private final DeploymentRepository deploymentRepository;
    private final IncidentRepository incidentRepository;
    private final ExternalCache cache;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<OpsDtos.EnvironmentSummary> summaries(Long projectId) {
        List<OpsDtos.EnvironmentSummary> result = new ArrayList<>();
        // 프로젝트에 등록된 환경만 (없으면 빈 배열, 14.2)
        for (CloudEnvironment env : environments.all(projectId)) {
            result.add(summary(projectId, env));
        }
        return result;
    }

    private OpsDtos.EnvironmentSummary summary(Long projectId, CloudEnvironment env) {
        List<IncidentSeverity> open = incidentRepository.findOpenSeverities(projectId, env.name());

        if (!deploymentRepository.existsByProjectIdAndEnvironment(projectId, env.name())) {
            return new OpsDtos.EnvironmentSummary(env.name(), env.label(), HealthRule.UNKNOWN, REASON_NOT_DEPLOYED,
                    null, null, null, open.size(), null);
        }

        Optional<Deployment> current = deploymentRepository
                .findFirstByProjectIdAndEnvironmentAndServiceAndStatusOrderByDeployedAtDescIdDesc(
                        projectId, env.name(), env.appDeployment(), DeploymentStatus.SUCCESS)
                .or(() -> deploymentRepository.findFirstByProjectIdAndEnvironmentAndStatusOrderByDeployedAtDescIdDesc(
                        projectId, env.name(), DeploymentStatus.SUCCESS));
        String imageTag = current.map(Deployment::getImageTag).orElse(null);
        OffsetDateTime deployedAt = current.map(d -> Times.toOffset(d.getDeployedAt())).orElse(null);

        // Prometheus나 실행 상태를 볼 Deployment가 연결되지 않은 환경
        if (!env.hasPrometheus() || env.appDeployment() == null) {
            return new OpsDtos.EnvironmentSummary(env.name(), env.label(), HealthRule.UNKNOWN, REASON_NOT_CONNECTED,
                    imageTag, deployedAt, null, open.size(), null);
        }

        String lastSuccessKey = "env-last-success:" + env.key();
        try {
            OpsDtos.Replicas replicas = kubeStatus.backendReplicas(env).orElse(new OpsDtos.Replicas(0, 0));
            OffsetDateTime collectedAt = Times.nowOffset(clock);
            cache.put(lastSuccessKey, collectedAt.toString(), LAST_SUCCESS_TTL);
            return new OpsDtos.EnvironmentSummary(env.name(), env.label(), HealthRule.of(replicas, open), null,
                    imageTag, deployedAt, replicas, open.size(), collectedAt);
        } catch (ExternalApiException e) {
            log.debug("environment {} unreachable: {}", env.name(), e.getMessage());
            OffsetDateTime lastSuccess = cache.peek(lastSuccessKey).map(OffsetDateTime::parse).orElse(null);
            return new OpsDtos.EnvironmentSummary(env.name(), env.label(), HealthRule.UNKNOWN, REASON_UNREACHABLE,
                    imageTag, deployedAt, null, open.size(), lastSuccess);
        }
    }
}
