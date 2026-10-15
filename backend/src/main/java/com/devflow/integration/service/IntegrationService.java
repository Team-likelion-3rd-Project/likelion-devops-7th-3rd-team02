package com.devflow.integration.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.integration.dto.IntegrationDtos;
import com.devflow.integration.entity.ProjectIntegration;
import com.devflow.integration.github.GithubActionsMapper;
import com.devflow.integration.github.GithubClient;
import com.devflow.integration.github.GithubRepositoryPath;
import com.devflow.integration.repository.ProjectIntegrationRepository;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.service.ProjectAccessChecker;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * GitHub 저장소 연결(G1·G2)과 파이프라인(C1, GitHub Actions).
 * 3차 CI는 GitHub Actions라 GitLab 연결(L1)은 쓰지 않는다. L2 조회는 항상 null(미연결).
 */
@Service
@RequiredArgsConstructor
public class IntegrationService {

    static final Duration RUNS_TTL = Duration.ofSeconds(15);
    static final Duration FINISHED_JOBS_TTL = Duration.ofMinutes(10);
    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_SIZE = 30;

    private final ProjectIntegrationRepository integrationRepository;
    private final ProjectAccessChecker projectAccessChecker;
    private final GithubClient github;
    private final Clock clock;

    /** 특정 workflow 파일만 보고 싶을 때 (예: ci.yml). 비우면 저장소의 모든 실행 */
    @Value("${devflow.github.workflow:}")
    private String workflow;

    /** G1: 연결 등록·변경 (OWNER만, 이미 있으면 덮어쓰기) */
    @Transactional
    public IntegrationDtos.GithubRepository connectGithub(Long loginUserId, Long projectId, String repositoryUrl) {
        ProjectMember membership = projectAccessChecker.getMembership(projectId, loginUserId);
        if (membership.getRole() != ProjectRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        String path = GithubRepositoryPath.parse(repositoryUrl);
        String fullName = github.findRepository(path)
                .orElseThrow(() -> new BusinessException(ErrorCode.REPOSITORY_NOT_ACCESSIBLE));

        ProjectIntegration integration = integrationRepository
                .findByProjectIdAndProvider(projectId, ProjectIntegration.GITHUB)
                .orElseGet(() -> new ProjectIntegration(membership.getProject(), ProjectIntegration.GITHUB, fullName));
        integration.changePath(fullName);
        integrationRepository.save(integration);
        return IntegrationDtos.GithubRepository.of(fullName);
    }

    /** G2: 연결된 저장소 (미연결이면 null) */
    @Transactional(readOnly = true)
    public IntegrationDtos.GithubRepository getGithub(Long loginUserId, Long projectId) {
        projectAccessChecker.checkMember(projectId, loginUserId);
        return githubPath(projectId).map(IntegrationDtos.GithubRepository::of).orElse(null);
    }

    /** C1: 파이프라인 목록. 미연결이면 빈 목록 (2.4) */
    @Transactional(readOnly = true)
    public IntegrationDtos.PipelineList pipelines(Long loginUserId, Long projectId, Integer page, Integer size) {
        projectAccessChecker.checkMember(projectId, loginUserId);
        int pageValue = page == null ? 0 : page;
        int sizeValue = size == null ? DEFAULT_SIZE : size;
        if (pageValue < 0 || sizeValue < 1 || sizeValue > MAX_SIZE) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "page는 0 이상, size는 1~" + MAX_SIZE + " 사이여야 합니다.");
        }

        Optional<String> repo = githubPath(projectId);
        if (repo.isEmpty()) {
            return new IntegrationDtos.PipelineList(List.of(), 0, Times.nowOffset(clock));
        }

        JsonNode runs = github.workflowRuns(repo.get(), workflow, pageValue + 1, sizeValue, RUNS_TTL);
        List<IntegrationDtos.Pipeline> pipelines = new ArrayList<>();
        for (JsonNode run : runs.path("workflow_runs")) {
            boolean finished = "completed".equalsIgnoreCase(run.path("status").asText(""));
            JsonNode jobs = github.runJobs(repo.get(), run.path("id").asLong(), finished ? FINISHED_JOBS_TTL : RUNS_TTL);
            pipelines.add(GithubActionsMapper.pipeline(run, jobs));
        }
        return new IntegrationDtos.PipelineList(pipelines, runs.path("total_count").asLong(0), Times.nowOffset(clock));
    }

    private Optional<String> githubPath(Long projectId) {
        return integrationRepository.findByProjectIdAndProvider(projectId, ProjectIntegration.GITHUB)
                .map(ProjectIntegration::getExternalPath);
    }
}
