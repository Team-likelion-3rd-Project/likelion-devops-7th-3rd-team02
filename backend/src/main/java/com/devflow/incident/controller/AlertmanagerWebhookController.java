package com.devflow.incident.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.global.webhook.WebhookTokenVerifier;
import com.devflow.incident.dto.AlertmanagerWebhookRequest;
import com.devflow.incident.service.AlertmanagerService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Alertmanager Webhook (Backend-API-구현-목록 I5, Backend 전용)
 * Alertmanager receivers.webhook_configs.http_config.authorization.credentials = ALERTMANAGER_WEBHOOK_TOKEN,
 * send_resolved: true. 클러스터 내부 Service 주소로만 호출한다 (Ingress 미노출 권장).
 */
@RestController
@RequestMapping("/api/webhooks/alertmanager")
@RequiredArgsConstructor
public class AlertmanagerWebhookController {

    private final AlertmanagerService alertmanagerService;

    @Value("${devflow.webhook.alertmanager-token:}")
    private String alertmanagerToken;

    @PostMapping
    public ResponseEntity<ApiResponse<AlertmanagerService.Result>> receive(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody AlertmanagerWebhookRequest request
    ) {
        WebhookTokenVerifier.verify(alertmanagerToken, authorization);
        return ResponseEntity.ok(ApiResponse.success(
                "알림을 처리했습니다.",
                alertmanagerService.handle(request)
        ));
    }
}
