package com.devflow.incident.controller;

import com.devflow.cloud.ProjectWebhookToken;
import com.devflow.cloud.WebhookTokenService;
import com.devflow.global.response.ApiResponse;
import com.devflow.incident.dto.AlertmanagerWebhookRequest;
import com.devflow.incident.service.AlertmanagerService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Alertmanager Webhook (Backend-API-구현-목록 I5, Backend 전용)
 * Alertmanager receivers.webhook_configs.http_config.authorization.credentials =
 *   프로젝트 Alertmanager 토큰(WT2, 라벨 없이 그 프로젝트로 기록)
 *   또는 서버 공용 토큰 ALERTMANAGER_WEBHOOK_TOKEN(운영자용, devflow_project_id 라벨 필수).
 * send_resolved: true.
 */
@RestController
@RequestMapping("/api/webhooks/alertmanager")
@RequiredArgsConstructor
public class AlertmanagerWebhookController {

    private final AlertmanagerService alertmanagerService;
    private final WebhookTokenService webhookTokens;

    @Value("${devflow.webhook.alertmanager-token:}")
    private String alertmanagerToken;

    @PostMapping
    public ResponseEntity<ApiResponse<AlertmanagerService.Result>> receive(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody AlertmanagerWebhookRequest request
    ) {
        WebhookTokenService.Caller caller =
                webhookTokens.authenticate(ProjectWebhookToken.Type.ALERTMANAGER, authorization, alertmanagerToken);
        return ResponseEntity.ok(ApiResponse.success(
                "알림을 처리했습니다.",
                alertmanagerService.handle(caller.projectId(), request)
        ));
    }
}
