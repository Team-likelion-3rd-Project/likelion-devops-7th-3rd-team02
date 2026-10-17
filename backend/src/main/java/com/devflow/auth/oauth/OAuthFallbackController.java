package com.devflow.auth.oauth;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

/** 설정되지 않은 제공자로 로그인을 시작하면 Frontend 콜백에 error=oauth_failed로 돌려보낸다 */
@RestController
@RequiredArgsConstructor
public class OAuthFallbackController {

    private final OAuthLoginHandlers handlers;

    @GetMapping("/oauth2/authorization/{provider}")
    public void notConfigured(@PathVariable String provider, HttpServletResponse response) throws IOException {
        response.sendRedirect(handlers.callback("error", OAuthLoginHandlers.OAUTH_FAILED));
    }
}
