package com.devflow.deployment.controller;

import com.devflow.deployment.dto.DeploymentResponse;
import com.devflow.deployment.dto.DeploymentWebhookRequest;
import com.devflow.deployment.service.DeploymentService;
import com.devflow.global.response.ApiResponse;
import com.devflow.global.webhook.WebhookTokenVerifier;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 배포 기록 Webhook (Backend-API-구현-목록 D3, Backend 전용)
 * 호출: 배포 검증 단계(ON1 self-hosted Runner 검증 후 "배포 SHA·digest·결과 기록")
 * 인증: Authorization: Bearer ${DEPLOY_WEBHOOK_TOKEN}
 */
@RestController
@RequestMapping("/api/webhooks/deployments")
@RequiredArgsConstructor
public class DeploymentWebhookController {

    private final DeploymentService deploymentService;

    @Value("${devflow.webhook.deploy-token:}")
    private String deployToken;

    @PostMapping
    public ResponseEntity<ApiResponse<DeploymentResponse>> record(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody DeploymentWebhookRequest request
    ) {
        WebhookTokenVerifier.verify(deployToken, authorization);
        return ResponseEntity.ok(ApiResponse.success(
                "배포 기록이 저장되었습니다.",
                deploymentService.record(request)
        ));
    }
}
