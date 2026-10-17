package com.devflow.deployment.controller;

import com.devflow.deployment.dto.DeploymentResponse;
import com.devflow.deployment.dto.DeploymentWebhookRequest;
import com.devflow.cloud.ProjectWebhookToken;
import com.devflow.cloud.WebhookTokenService;
import com.devflow.deployment.service.DeploymentService;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 배포 기록 Webhook (Backend-API-구현-목록 D3, Backend 전용)
 * 호출: 배포 검증 단계(ON1 self-hosted Runner 검증 후 "배포 SHA·digest·결과 기록")
 * 인증 (14.3): Authorization: Bearer {프로젝트 배포 토큰(WT2)} → 본문 projectId 생략 가능, 다르면 403
 *       또는 서버 공용 토큰 ${DEPLOY_WEBHOOK_TOKEN}(운영자용) → projectId 필수
 */
@RestController
@RequestMapping("/api/webhooks/deployments")
@RequiredArgsConstructor
public class DeploymentWebhookController {

    private final DeploymentService deploymentService;
    private final WebhookTokenService webhookTokens;

    @Value("${devflow.webhook.deploy-token:}")
    private String deployToken;

    @PostMapping
    public ResponseEntity<ApiResponse<DeploymentResponse>> record(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody DeploymentWebhookRequest request
    ) {
        WebhookTokenService.Caller caller =
                webhookTokens.authenticate(ProjectWebhookToken.Type.DEPLOYMENT, authorization, deployToken);
        Long projectId = projectIdFor(caller, request.projectId());
        return ResponseEntity.ok(ApiResponse.success(
                "배포 기록이 저장되었습니다.",
                deploymentService.record(projectId, request)
        ));
    }

    static Long projectIdFor(WebhookTokenService.Caller caller, Long requested) {
        if (caller.projectToken()) {
            if (requested != null && !requested.equals(caller.projectId())) {
                throw new BusinessException(ErrorCode.FORBIDDEN, "토큰의 프로젝트와 projectId가 다릅니다.");
            }
            return caller.projectId();
        }
        if (requested == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "projectId는 필수입니다.");
        }
        return requested;
    }
}
