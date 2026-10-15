package com.devflow.global.webhook;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 외부 시스템(CI, Alertmanager)이 호출하는 Webhook의 공유 토큰 확인.
 * 헤더: Authorization: Bearer {토큰}. 토큰이 설정되지 않은 환경에서는 Webhook을 받지 않는다.
 */
public final class WebhookTokenVerifier {

    private static final String PREFIX = "Bearer ";

    private WebhookTokenVerifier() {
    }

    public static void verify(String expectedToken, String authorizationHeader) {
        if (expectedToken == null || expectedToken.isBlank()
                || authorizationHeader == null || !authorizationHeader.startsWith(PREFIX)) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_TOKEN);
        }
        byte[] expected = expectedToken.getBytes(StandardCharsets.UTF_8);
        byte[] actual = authorizationHeader.substring(PREFIX.length()).trim().getBytes(StandardCharsets.UTF_8);
        // 길이·내용 비교 시간이 같도록 (토큰 추측 방지)
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new BusinessException(ErrorCode.INVALID_WEBHOOK_TOKEN);
        }
    }
}
