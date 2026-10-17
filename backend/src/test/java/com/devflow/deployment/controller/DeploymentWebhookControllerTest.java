package com.devflow.deployment.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.cloud.WebhookTokenService;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

class DeploymentWebhookControllerTest {

    private static final WebhookTokenService.Caller PROJECT_7 = new WebhookTokenService.Caller(7L);
    private static final WebhookTokenService.Caller SERVER = new WebhookTokenService.Caller(null);

    @Test
    void 프로젝트_토큰이면_projectId를_생략할_수_있다() {
        assertThat(DeploymentWebhookController.projectIdFor(PROJECT_7, null)).isEqualTo(7L);
        assertThat(DeploymentWebhookController.projectIdFor(PROJECT_7, 7L)).isEqualTo(7L);
    }

    @Test
    void 프로젝트_토큰과_다른_projectId는_403() {
        assertThatThrownBy(() -> DeploymentWebhookController.projectIdFor(PROJECT_7, 8L))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }

    @Test
    void 서버_공용_토큰은_projectId_필수() {
        assertThat(DeploymentWebhookController.projectIdFor(SERVER, 3L)).isEqualTo(3L);
        assertThatThrownBy(() -> DeploymentWebhookController.projectIdFor(SERVER, null))
                .isInstanceOfSatisfying(BusinessException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
    }
}
