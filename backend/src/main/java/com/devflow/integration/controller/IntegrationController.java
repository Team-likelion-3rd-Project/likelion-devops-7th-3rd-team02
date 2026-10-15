package com.devflow.integration.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.integration.dto.IntegrationDtos;
import com.devflow.integration.service.IntegrationService;
import com.devflow.project.service.ProjectAccessChecker;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}")
@RequiredArgsConstructor
public class IntegrationController {

    private final IntegrationService integrationService;
    private final ProjectAccessChecker projectAccessChecker;

    /** G1: GitHub 저장소 연결 (OWNER) */
    @PostMapping("/integrations/github")
    public ResponseEntity<ApiResponse<IntegrationDtos.GithubRepository>> connectGithub(
            Authentication authentication,
            @PathVariable Long projectId,
            @Valid @RequestBody IntegrationDtos.GithubConnectRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("GitHub 저장소를 연결했습니다.",
                integrationService.connectGithub(userId(authentication), projectId, request.repositoryUrl())));
    }

    /** G2: 연결된 GitHub 저장소 (미연결 null) */
    @GetMapping("/github/repository")
    public ResponseEntity<ApiResponse<IntegrationDtos.GithubRepository>> getGithub(
            Authentication authentication, @PathVariable Long projectId) {
        return ResponseEntity.ok(ApiResponse.success("GitHub 저장소 조회에 성공했습니다.",
                integrationService.getGithub(userId(authentication), projectId)));
    }

    /** L2: GitLab은 3차에서 쓰지 않아 항상 미연결(null). 프로젝트 정보 화면이 404 없이 동작하도록 둔다 */
    @GetMapping("/integrations/gitlab")
    public ResponseEntity<ApiResponse<Object>> getGitlab(
            Authentication authentication, @PathVariable Long projectId) {
        projectAccessChecker.checkMember(projectId, userId(authentication));
        return ResponseEntity.ok(ApiResponse.success("GitLab은 연결되지 않았습니다.", null));
    }

    /** C1: 파이프라인 목록 (GitHub Actions). page 0부터, size 기본 10·최대 30 */
    @GetMapping("/cicd/pipelines")
    public ResponseEntity<ApiResponse<IntegrationDtos.PipelineList>> pipelines(
            Authentication authentication,
            @PathVariable Long projectId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        return ResponseEntity.ok(ApiResponse.success("파이프라인 조회에 성공했습니다.",
                integrationService.pipelines(userId(authentication), projectId, page, size)));
    }

    private static Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
