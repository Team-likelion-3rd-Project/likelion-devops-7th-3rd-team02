package com.devflow.deployment.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.deployment.type.DeploymentStatus;
import org.junit.jupiter.api.Test;

class DeploymentWebhookRequestTest {

    private DeploymentWebhookRequest request(String commitMessage) {
        return new DeploymentWebhookRequest(1L, "dev", "backend", "7f3c2a1", commitMessage,
                "7f3c2a1", null, null, DeploymentStatus.SUCCESS, 1L, null);
    }

    @Test
    void 커밋_메시지는_첫_줄만_저장한다() {
        assertThat(request("feat: 로그인\n\n본문 설명").commitTitle()).isEqualTo("feat: 로그인");
        assertThat(request("   ").commitTitle()).isNull();
        assertThat(request(null).commitTitle()).isNull();
    }

    @Test
    void 커밋_제목이_길면_300자로_자른다() {
        assertThat(request("가".repeat(500)).commitTitle()).hasSize(300);
    }
}
