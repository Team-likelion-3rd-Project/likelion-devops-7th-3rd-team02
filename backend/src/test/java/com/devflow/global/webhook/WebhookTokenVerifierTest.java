package com.devflow.global.webhook;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class WebhookTokenVerifierTest {

    @Test
    void 같은_토큰이면_통과() {
        assertThatCode(() -> WebhookTokenVerifier.verify("secret-token", "Bearer secret-token"))
                .doesNotThrowAnyException();
    }

    @Test
    void 토큰이_없거나_다르거나_서버에_설정이_없으면_거절() {
        assertThatThrownBy(() -> WebhookTokenVerifier.verify("secret-token", null))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> WebhookTokenVerifier.verify("secret-token", "Bearer other"))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> WebhookTokenVerifier.verify("", "Bearer "))
                .isInstanceOf(BusinessException.class);
    }
}
