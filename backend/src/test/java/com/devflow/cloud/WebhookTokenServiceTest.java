package com.devflow.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class WebhookTokenServiceTest {

    @Test
    void 토큰은_SHA256_16진수로만_저장한다() {
        // echo -n abc | sha256sum
        assertThat(WebhookTokenService.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
                .hasSize(64);
    }

    @Test
    void 토큰_종류는_대소문자_무관() {
        assertThat(WebhookTokenService.parse("deployment")).isEqualTo(ProjectWebhookToken.Type.DEPLOYMENT);
        assertThat(WebhookTokenService.parse(" Alertmanager ")).isEqualTo(ProjectWebhookToken.Type.ALERTMANAGER);
        assertThatThrownBy(() -> WebhookTokenService.parse("github")).isInstanceOf(BusinessException.class);
    }
}
