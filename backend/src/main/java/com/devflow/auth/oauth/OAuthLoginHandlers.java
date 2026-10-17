package com.devflow.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Set;

/**
 * 소셜 로그인 결과를 Frontend 콜백으로 돌려보낸다 (X1~X3 확정 규칙)
 * 성공: {FRONTEND_BASE_URL}/oauth/callback?code={1회용 code}
 * 실패: {FRONTEND_BASE_URL}/oauth/callback?error={access_denied|email_not_available|account_conflict|oauth_failed}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthLoginHandlers implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    static final String OAUTH_FAILED = "oauth_failed";
    static final Set<String> PUBLIC_ERRORS = Set.of(
            "access_denied", SocialAccountService.EMAIL_NOT_AVAILABLE, SocialAccountService.ACCOUNT_CONFLICT);

    private final OAuthLoginCodeService codes;
    private final OAuthProperties properties;
    private final CookieAuthorizationRequestRepository requestRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        requestRepository.clear(request, response);
        Object userId = ((OAuth2User) authentication.getPrincipal()).getAttribute(DevflowOAuth2UserService.USER_ID_ATTRIBUTE);
        String code = codes.issue(((Number) userId).longValue());
        response.sendRedirect(callback("code", code));
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException {
        requestRepository.clear(request, response);
        String error = errorCode(exception);
        log.warn("oauth login failed: error={}, reason={}", error, exception.getMessage());
        response.sendRedirect(callback("error", error));
    }

    static String errorCode(AuthenticationException exception) {
        if (exception instanceof OAuth2AuthenticationException oauth) {
            String code = oauth.getError().getErrorCode();
            if (PUBLIC_ERRORS.contains(code)) {
                return code;
            }
        }
        return OAUTH_FAILED;
    }

    public String callback(String key, String value) {
        return UriComponentsBuilder.fromUriString(properties.frontendBaseUrl())
                .path("/oauth/callback")
                .queryParam(key, value)
                .build()
                .encode()
                .toUriString();
    }
}
