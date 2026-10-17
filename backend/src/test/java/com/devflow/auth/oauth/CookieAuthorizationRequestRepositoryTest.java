package com.devflow.auth.oauth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

class CookieAuthorizationRequestRepositoryTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-10-17T12:00:00Z"), ZoneOffset.UTC);
    private final CookieAuthorizationRequestRepository repository =
            new CookieAuthorizationRequestRepository(new ObjectMapper(), "test-secret-test-secret-test-secret", clock);

    private OAuth2AuthorizationRequest request() {
        return OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri("https://github.com/login/oauth/authorize")
                .clientId("client")
                .redirectUri("http://localhost:3000/login/oauth2/code/github")
                .scopes(Set.of("read:user"))
                .state("state-123")
                .attributes(Map.of("registration_id", "github"))
                .authorizationRequestUri("https://github.com/login/oauth/authorize?client_id=client&state=state-123")
                .build();
    }

    private String savedCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        repository.saveAuthorizationRequest(request(), new MockHttpServletRequest(), response);
        String header = response.getHeader("Set-Cookie");
        assertThat(header).contains("HttpOnly").contains("SameSite=Lax");
        return header.substring(header.indexOf('=') + 1, header.indexOf(';'));
    }

    private MockHttpServletRequest callback(String cookie, String state) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(CookieAuthorizationRequestRepository.COOKIE_NAME, cookie));
        request.setParameter("state", state);
        return request;
    }

    @Test
    void 저장한_요청을_state가_같을_때만_되돌린다() {
        String cookie = savedCookie();

        OAuth2AuthorizationRequest loaded = repository.loadAuthorizationRequest(callback(cookie, "state-123"));

        assertThat(loaded).isNotNull();
        assertThat(loaded.getRedirectUri()).isEqualTo("http://localhost:3000/login/oauth2/code/github");
        assertThat(loaded.<String>getAttribute("registration_id")).isEqualTo("github");
        assertThat(repository.loadAuthorizationRequest(callback(cookie, "other"))).isNull();
    }

    @Test
    void 서명이_바뀐_쿠키는_무시한다() {
        String cookie = savedCookie();
        String tampered = cookie.substring(0, cookie.lastIndexOf('.') + 1) + "AAAA";

        assertThat(repository.loadAuthorizationRequest(callback(tampered, "state-123"))).isNull();
    }

    @Test
    void 오분이_지나면_무효() {
        String cookie = savedCookie();
        CookieAuthorizationRequestRepository later = new CookieAuthorizationRequestRepository(
                new ObjectMapper(), "test-secret-test-secret-test-secret",
                Clock.offset(clock, java.time.Duration.ofMinutes(6)));

        assertThat(later.loadAuthorizationRequest(callback(cookie, "state-123"))).isNull();
    }
}
