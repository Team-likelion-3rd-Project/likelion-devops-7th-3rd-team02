package com.devflow.ops.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 프로젝트별 클라우드 연결 공통 설정 (Backend-API-구현-목록 14.4)
 * allow-private-network: 사용자가 등록한 주소가 사설망이어도 호출할지 (온프렘 시연 true, 공개 서비스 false)
 * aws-principal-arn: 사용자 역할 신뢰 정책에 넣을 DevFlow Backend의 AWS 주체 (화면 안내용)
 * encryption-key: Prometheus 토큰 암호화 키 (base64 32바이트, 없으면 JWT 비밀값에서 파생)
 */
@ConfigurationProperties(prefix = "devflow.cloud")
public record CloudProperties(
        Boolean allowPrivateNetwork,
        String awsPrincipalArn,
        String encryptionKey
) {

    public CloudProperties {
        allowPrivateNetwork = allowPrivateNetwork == null || allowPrivateNetwork;
        awsPrincipalArn = awsPrincipalArn == null || awsPrincipalArn.isBlank() ? null : awsPrincipalArn.trim();
        encryptionKey = encryptionKey == null || encryptionKey.isBlank() ? null : encryptionKey.trim();
    }
}
