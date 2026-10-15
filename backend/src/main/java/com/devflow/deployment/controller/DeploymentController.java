package com.devflow.deployment.controller;

import com.devflow.deployment.dto.DeploymentListResponse;
import com.devflow.deployment.service.DeploymentService;
import com.devflow.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/deployments")
@RequiredArgsConstructor
public class DeploymentController {

    private final DeploymentService deploymentService;

    /**
     * 배포 이력 (Backend-API-구현-목록 D1). page 0부터, size 기본 10·최대 50.
     * 대시보드 최근 배포는 size=3, CI/CD 현재 배포는 size=1.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<DeploymentListResponse>> getDeployments(
            Authentication authentication,
            @PathVariable Long projectId,
            @RequestParam(required = false) String environment,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(ApiResponse.success(
                "배포 이력 조회에 성공했습니다.",
                deploymentService.getDeployments(userId, projectId, environment, page, size)
        ));
    }
}
