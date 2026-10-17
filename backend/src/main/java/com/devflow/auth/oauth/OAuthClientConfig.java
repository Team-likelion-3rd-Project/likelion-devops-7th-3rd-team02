package com.devflow.auth.oauth;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.LinkedHashMap;
import java.util.Map;

@Configuration
@EnableConfigurationProperties(OAuthProperties.class)
public class OAuthClientConfig {

    public static final String GITHUB = "github";
    public static final String GOOGLE = "google";

    /** 설정된 제공자만 담는다 (비어 있을 수 있음). 콜백 주소는 Frontend 주소를 거친다 (같은 도메인, 쿠키 문제 없음) */
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository(OAuthProperties properties) {
        Map<String, ClientRegistration> registrations = new LinkedHashMap<>();
        String redirectUri = properties.frontendBaseUrl() + "/login/oauth2/code/{registrationId}";

        OAuthProperties.Provider github = properties.github();
        if (github.configured()) {
            registrations.put(GITHUB, ClientRegistration.withRegistrationId(GITHUB)
                    .clientName("GitHub")
                    .clientId(github.clientId().trim())
                    .clientSecret(github.clientSecret().trim())
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(redirectUri)
                    .scope("read:user", "user:email")
                    .authorizationUri(or(github.authorizationUri(), "https://github.com/login/oauth/authorize"))
                    .tokenUri(or(github.tokenUri(), "https://github.com/login/oauth/access_token"))
                    .userInfoUri(or(github.userInfoUri(), "https://api.github.com/user"))
                    .userNameAttributeName("id")
                    .build());
        }

        OAuthProperties.Provider google = properties.google();
        if (google.configured()) {
            // openid 범위를 쓰지 않아 ID 토큰 검증 없이 userinfo(email_verified 포함)로 처리한다
            registrations.put(GOOGLE, ClientRegistration.withRegistrationId(GOOGLE)
                    .clientName("Google")
                    .clientId(google.clientId().trim())
                    .clientSecret(google.clientSecret().trim())
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri(redirectUri)
                    .scope("email", "profile")
                    .authorizationUri(or(google.authorizationUri(), "https://accounts.google.com/o/oauth2/v2/auth"))
                    .tokenUri(or(google.tokenUri(), "https://oauth2.googleapis.com/token"))
                    .userInfoUri(or(google.userInfoUri(), "https://www.googleapis.com/oauth2/v3/userinfo"))
                    .userNameAttributeName("sub")
                    .build());
        }

        return registrationId -> registrationId == null ? null : registrations.get(registrationId);
    }

    /** 제공자 접근 토큰은 로그인에만 쓰고 보관하지 않는다 (세션·메모리 저장 없음) */
    @Bean
    public OAuth2AuthorizedClientRepository authorizedClientRepository() {
        return new OAuth2AuthorizedClientRepository() {
            @Override
            public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
                    String clientRegistrationId, Authentication principal, HttpServletRequest request) {
                return null;
            }

            @Override
            public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient, Authentication principal,
                    HttpServletRequest request, HttpServletResponse response) {
            }

            @Override
            public void removeAuthorizedClient(String clientRegistrationId, Authentication principal,
                    HttpServletRequest request, HttpServletResponse response) {
            }
        };
    }

    private static String or(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
