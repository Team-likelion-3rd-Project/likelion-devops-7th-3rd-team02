package com.devflow.auth.oauth;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 소셜 로그인 설정 (Backend-API-구현-목록 X1~X3).
 * client-id가 비어 있는 제공자는 등록하지 않는다 (해당 버튼을 누르면 error=oauth_failed로 돌려보냄).
 * 엔드포인트 주소는 기본값이 실제 GitHub·Google이고, CI에서는 WireMock 주소로 바꿔 흐름을 시험한다.
 */
@ConfigurationProperties(prefix = "devflow.oauth")
public record OAuthProperties(
        String frontendBaseUrl,
        Provider github,
        Provider google
) {

    public OAuthProperties {
        frontendBaseUrl = frontendBaseUrl == null || frontendBaseUrl.isBlank()
                ? "http://localhost:3000"
                : frontendBaseUrl.trim().replaceAll("/+$", "");
        github = github == null ? new Provider(null, null, null, null, null, null) : github;
        google = google == null ? new Provider(null, null, null, null, null, null) : google;
    }

    public record Provider(
            String clientId,
            String clientSecret,
            String authorizationUri,
            String tokenUri,
            String userInfoUri,
            String emailsUri
    ) {

        public boolean configured() {
            return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
        }
    }
}
