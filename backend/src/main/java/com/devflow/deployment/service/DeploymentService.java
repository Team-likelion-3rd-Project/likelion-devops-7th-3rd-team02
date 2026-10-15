package com.devflow.deployment.service;

import com.devflow.deployment.dto.DeploymentListResponse;
import com.devflow.deployment.dto.DeploymentResponse;
import com.devflow.deployment.dto.DeploymentWebhookRequest;
import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.repository.DeploymentRepository;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class DeploymentService {

    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 50;

    private final DeploymentRepository deploymentRepository;
    private final ProjectAccessChecker projectAccessChecker;
    private final Clock clock;

    /** D3: 배포 기록 저장. pipelineId가 같으면 시작 기록을 완료 기록으로 갱신 */
    @Transactional
    public DeploymentResponse record(DeploymentWebhookRequest request) {
        Project project = projectAccessChecker.getProject(request.projectId());
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

        return new DeploymentListResponse(
                result.getContent().stream().map(DeploymentResponse::from).toList(),
                result.getTotalElements(),
                Times.nowOffset(clock)
        );
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
