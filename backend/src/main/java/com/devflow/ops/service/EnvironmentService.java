package com.devflow.ops.service;

import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.repository.DeploymentRepository;
import com.devflow.deployment.type.DeploymentStatus;
import com.devflow.global.external.ExternalApiException;
import com.devflow.global.external.ExternalCache;
import com.devflow.global.time.Times;
import com.devflow.incident.repository.IncidentRepository;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.ops.config.Environments;
import com.devflow.ops.config.OpsProperties;
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
    private static final Duration LAST_SUCCESS_TTL = Duration.ofDays(7);

    private final Environments environments;
    private final OpsProperties properties;
    private final KubeStatusService kubeStatus;
    private final DeploymentRepository deploymentRepository;
    private final IncidentRepository incidentRepository;
    private final ExternalCache cache;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<OpsDtos.EnvironmentSummary> summaries(Long projectId) {
        List<OpsDtos.EnvironmentSummary> result = new ArrayList<>();
        for (OpsProperties.Environment env : environments.all()) {
            result.add(summary(projectId, env));
        }
        return result;
    }

    private OpsDtos.EnvironmentSummary summary(Long projectId, OpsProperties.Environment env) {
        List<IncidentSeverity> open = incidentRepository.findOpenSeverities(projectId, env.name());

        if (!deploymentRepository.existsByProjectIdAndEnvironment(projectId, env.name())) {
            return new OpsDtos.EnvironmentSummary(env.name(), env.label(), HealthRule.UNKNOWN, REASON_NOT_DEPLOYED,
                    null, null, null, open.size(), null);
        }

        Optional<Deployment> current = deploymentRepository
                .findFirstByProjectIdAndEnvironmentAndServiceAndStatusOrderByDeployedAtDescIdDesc(
                        projectId, env.name(), properties.backendDeployment(), DeploymentStatus.SUCCESS)
                .or(() -> deploymentRepository.findFirstByProjectIdAndEnvironmentAndStatusOrderByDeployedAtDescIdDesc(
                        projectId, env.name(), DeploymentStatus.SUCCESS));
        String imageTag = current.map(Deployment::getImageTag).orElse(null);
        OffsetDateTime deployedAt = current.map(d -> Times.toOffset(d.getDeployedAt())).orElse(null);

        String lastSuccessKey = "env-last-success:" + env.name();
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
