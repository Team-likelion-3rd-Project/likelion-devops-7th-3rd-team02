package com.devflow.deployment.service;

import com.devflow.deployment.dto.DeploymentListResponse;
import com.devflow.deployment.dto.DeploymentResponse;
import com.devflow.deployment.dto.DeploymentWebhookRequest;
import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.repository.DeploymentRepository;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.cloud.ProjectEnvironments;
import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.service.HealthRule;
import com.devflow.ops.service.KubeStatusService;
import com.devflow.project.entity.Project;
import com.devflow.project.service.ProjectAccessChecker;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeploymentService {

    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 50;

    private final DeploymentRepository deploymentRepository;
    private final ProjectAccessChecker projectAccessChecker;
    private final Clock clock;
    private final ProjectEnvironments environments;
    private final KubeStatusService kubeStatus;

    /** D3: 배포 기록 저장. pipelineId가 같으면 시작 기록을 완료 기록으로 갱신 */
    @Transactional
    public DeploymentResponse record(Long projectId, DeploymentWebhookRequest request) {
        Project project = projectAccessChecker.getProject(projectId);
        String service = request.service().trim();

        Deployment deployment = request.pipelineId() == null
                ? new Deployment(project, service, null)
                : deploymentRepository
                        .findByProjectIdAndPipelineIdAndService(project.getId(), request.pipelineId(), service)
                        .orElseGet(() -> new Deployment(project, service, request.pipelineId()));

        deployment.record(
                request.environment().trim(),
                request.commitSha().toLowerCase(),
                request.commitTitle(),
                request.imageTag().trim(),
                request.imageDigest(),
                request.revision(),
                request.status(),
                request.deployedAt() != null ? Times.toSeoul(request.deployedAt()) : Times.now(clock)
        );

        Deployment saved = deploymentRepository.saveAndFlush(deployment);
        log.info("deployment recorded: project={}, env={}, service={}, pipeline={}, status={}",
                project.getId(), saved.getEnvironment(), service, saved.getPipelineId(), saved.getStatus());
        return DeploymentResponse.from(saved);
    }

    /** D1: 배포 이력 (최신순). environment를 주면 그 환경만 */
    @Transactional(readOnly = true)
    public DeploymentListResponse getDeployments(
            Long loginUserId,
            Long projectId,
            String environment,
            Integer page,
            Integer size
    ) {
        projectAccessChecker.checkMember(projectId, loginUserId);

        Pageable pageable = toPageable(page, size);
        Page<Deployment> result = environment == null || environment.isBlank()
                ? deploymentRepository.findByProjectId(projectId, pageable)
                : deploymentRepository.findByProjectIdAndEnvironment(projectId, environment.trim(), pageable);

        List<DeploymentResponse> deployments = new ArrayList<>(
                result.getContent().stream().map(DeploymentResponse::from).toList());
        if (pageable.getPageNumber() == 0 && !deployments.isEmpty()) {
            deployments.set(0, deployments.get(0).withHealth(latestHealth(projectId, deployments.get(0))));
        }

        return new DeploymentListResponse(
                deployments,
                result.getTotalElements(),
                Times.nowOffset(clock)
        );
    }

    /** 최근 배포의 실행 상태: 그 환경에서 같은 이름 Deployment의 레플리카로 판정. 확인 불가·지표 없음은 null */
    private String latestHealth(Long projectId, DeploymentResponse latest) {
        try {
            CloudEnvironment env = environments.find(projectId, latest.environment()).orElse(null);
            if (env == null || !env.hasPrometheus()) {
                return null;
            }
            return kubeStatus.replicas(env, latest.service())
                    .map(replicas -> HealthRule.of(replicas, List.of()))
                    .orElse(null);
        } catch (BusinessException e) {
            return null;
        }
    }

    static Pageable toPageable(Integer page, Integer size) {
        int pageValue = page == null ? 0 : page;
        int sizeValue = size == null ? DEFAULT_SIZE : size;
        if (pageValue < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page는 0 이상이어야 합니다.");
        }
        if (sizeValue < 1 || sizeValue > MAX_SIZE) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size는 1~" + MAX_SIZE + " 사이여야 합니다.");
        }
        return PageRequest.of(pageValue, sizeValue,
                Sort.by(Sort.Order.desc("deployedAt"), Sort.Order.desc("id")));
    }
}
