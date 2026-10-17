package com.devflow.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;

class OAuthLoginHandlersTest {

    @Test
    void 정해진_4개_오류만_그대로_보내고_나머지는_oauth_failed() {
        assertThat(OAuthLoginHandlers.errorCode(new OAuth2AuthenticationException(new OAuth2Error("access_denied"))))
                .isEqualTo("access_denied");
        assertThat(OAuthLoginHandlers.errorCode(new OAuth2AuthenticationException(new OAuth2Error("account_conflict"))))
                .isEqualTo("account_conflict");
        assertThat(OAuthLoginHandlers.errorCode(new OAuth2AuthenticationException(new OAuth2Error("authorization_request_not_found"))))
                .isEqualTo("oauth_failed");
        assertThat(OAuthLoginHandlers.errorCode(new BadCredentialsException("x"))).isEqualTo("oauth_failed");
    }

    @Test
    void code는_원문이_아닌_SHA256_해시로_저장한다() {
        assertThat(OAuthLoginCodeService.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
