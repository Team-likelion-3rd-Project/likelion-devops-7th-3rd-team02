package com.devflow.auth.oauth;

import com.devflow.global.external.ExternalHttp;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;

/**
 * 제공자 사용자 정보 → SocialProfile → DevFlow 사용자 ID.
 * GitHub는 이메일이 비공개일 수 있어 GET /user/emails에서 "primary + verified" 이메일을 찾는다.
 */
@Slf4j
@Component
public class DevflowOAuth2UserService extends DefaultOAuth2UserService {

    public static final String USER_ID_ATTRIBUTE = "devflowUserId";

    private final SocialAccountService accounts;
    private final OAuthProperties properties;
    private final RestClient restClient = ExternalHttp.restClient().build();

    public DevflowOAuth2UserService(SocialAccountService accounts, OAuthProperties properties) {
        this.accounts = accounts;
        this.properties = properties;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User providerUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = providerUser.getAttributes();

        SocialProfile profile = switch (registrationId) {
            case OAuthClientConfig.GITHUB -> github(attributes, userRequest.getAccessToken().getTokenValue());
            case OAuthClientConfig.GOOGLE -> google(attributes);
            default -> throw new OAuth2AuthenticationException(new OAuth2Error("oauth_failed"), "unknown provider");
        };

        Long userId = accounts.resolveUserId(profile);
        Map<String, Object> result = new HashMap<>();
        result.put(USER_ID_ATTRIBUTE, userId);
        result.put("provider", profile.provider());
        return new DefaultOAuth2User(AuthorityUtils.NO_AUTHORITIES, result, USER_ID_ATTRIBUTE);
    }

    private SocialProfile github(Map<String, Object> attributes, String accessToken) {
        String email = null;
        boolean verified = false;
        try {
            JsonNode emails = restClient.get()
                    .uri(emailsUri())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .retrieve()
                    .body(JsonNode.class);
            if (emails != null) {
                for (JsonNode entry : emails) {
                    if (entry.path("verified").asBoolean(false)
                            && (entry.path("primary").asBoolean(false) || email == null)) {
                        email = entry.path("email").asText(null);
                        verified = true;
                    }
                }
            }
        } catch (RuntimeException e) {
            log.warn("github emails lookup failed: {}", e.getMessage());
        }
        return new SocialProfile(
                "GITHUB",
                String.valueOf(attributes.get("id")),
                string(attributes.get("login")),
                string(attributes.get("name")),
                email,
                verified
        );
    }

    private static SocialProfile google(Map<String, Object> attributes) {
        Object verified = attributes.get("email_verified");
        return new SocialProfile(
                "GOOGLE",
                string(attributes.get("sub")),
                null,
                string(attributes.get("name")),
                string(attributes.get("email")),
                Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified))
        );
    }

    private String emailsUri() {
        String configured = properties.github().emailsUri();
        return configured == null || configured.isBlank() ? "https://api.github.com/user/emails" : configured.trim();
    }

    private static String string(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
