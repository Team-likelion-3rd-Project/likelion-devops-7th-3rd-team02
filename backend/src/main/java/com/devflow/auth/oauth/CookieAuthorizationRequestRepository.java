package com.devflow.auth.oauth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

/**
 * OAuth 진행 상태(state 등)를 서버 세션 대신 서명한 쿠키에 담는다 (Backend가 STATELESS·여러 Pod여도 동작).
 * - Java 직렬화를 쓰지 않고 필요한 값만 JSON으로 저장, HMAC-SHA256 서명 확인 후에만 읽는다.
 * - 돌아온 요청의 state가 저장한 state와 다르면 없는 것으로 본다 (CSRF 방지).
 * - 5분 지나면 무효.
 */
@Slf4j
@Component
public class CookieAuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

    static final String COOKIE_NAME = "devflow_oauth2_request";
    static final Duration TTL = Duration.ofMinutes(5);
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;
    private final byte[] signingKey;
    private final Clock clock;

    public CookieAuthorizationRequestRepository(
            ObjectMapper objectMapper,
            @Value("${jwt.secret}") String jwtSecret,
            Clock clock
    ) {
        this.objectMapper = objectMapper;
        // JWT 서명 키와 같은 값을 그대로 쓰지 않도록 용도 문자열을 붙여 파생
        this.signingKey = sha256(("oauth2-request:" + jwtSecret).getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    @Override
    public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
        OAuth2AuthorizationRequest stored = read(request);
        if (stored == null) {
            return null;
        }
        String state = request.getParameter(OAuth2ParameterNames.STATE);
        return state != null && state.equals(stored.getState()) ? stored : null;
    }

    @Override
    public void saveAuthorizationRequest(
            OAuth2AuthorizationRequest authorizationRequest,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (authorizationRequest == null) {
            clear(request, response);
            return;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("exp", clock.instant().plus(TTL).getEpochSecond());
        data.put("authorizationUri", authorizationRequest.getAuthorizationUri());
        data.put("clientId", authorizationRequest.getClientId());
        data.put("redirectUri", authorizationRequest.getRedirectUri());
        data.put("scopes", List.copyOf(authorizationRequest.getScopes()));
        data.put("state", authorizationRequest.getState());
        data.put("additionalParameters", stringMap(authorizationRequest.getAdditionalParameters()));
        data.put("attributes", stringMap(authorizationRequest.getAttributes()));
        data.put("authorizationRequestUri", authorizationRequest.getAuthorizationRequestUri());
        try {
            String payload = ENCODER.encodeToString(objectMapper.writeValueAsBytes(data));
            write(request, response, payload + "." + sign(payload), TTL);
        } catch (Exception e) {
            throw new IllegalStateException("OAuth 요청 상태를 저장하지 못했습니다.", e);
        }
    }

    @Override
    public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
        OAuth2AuthorizationRequest loaded = loadAuthorizationRequest(request);
        clear(request, response);
        return loaded;
    }

    public void clear(HttpServletRequest request, HttpServletResponse response) {
        write(request, response, "", Duration.ZERO);
    }

    private OAuth2AuthorizationRequest read(HttpServletRequest request) {
        String value = cookieValue(request);
        if (value == null || value.isBlank()) {
            return null;
        }
        int dot = value.lastIndexOf('.');
        if (dot <= 0) {
            return null;
        }
        String payload = value.substring(0, dot);
        String signature = value.substring(dot + 1);
        if (!MessageDigest.isEqual(sign(payload).getBytes(StandardCharsets.US_ASCII),
                signature.getBytes(StandardCharsets.US_ASCII))) {
            log.warn("oauth2 request cookie signature mismatch");
            return null;
        }
        try {
            Map<String, Object> data = objectMapper.readValue(DECODER.decode(payload), new TypeReference<>() {
            });
            long exp = ((Number) data.get("exp")).longValue();
            if (clock.instant().getEpochSecond() > exp) {
                return null;
            }
            @SuppressWarnings("unchecked")
            List<String> scopes = (List<String>) data.getOrDefault("scopes", List.of());
            @SuppressWarnings("unchecked")
            Map<String, Object> additional = (Map<String, Object>) data.getOrDefault("additionalParameters", Map.of());
            @SuppressWarnings("unchecked")
            Map<String, Object> attributes = (Map<String, Object>) data.getOrDefault("attributes", Map.of());

            return OAuth2AuthorizationRequest.authorizationCode()
                    .authorizationUri((String) data.get("authorizationUri"))
                    .clientId((String) data.get("clientId"))
                    .redirectUri((String) data.get("redirectUri"))
                    .scopes(new LinkedHashSet<>(scopes))
                    .state((String) data.get("state"))
                    .additionalParameters(additional)
                    .attributes(attributes)
                    .authorizationRequestUri((String) data.get("authorizationRequestUri"))
                    .build();
        } catch (Exception e) {
            log.warn("oauth2 request cookie unreadable: {}", e.getMessage());
            return null;
        }
    }

    private static Map<String, Object> stringMap(Map<String, Object> source) {
        Map<String, Object> result = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            if (value != null) {
                result.put(key, String.valueOf(value));
            }
        });
        return result;
    }

    private static String cookieValue(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private static void write(HttpServletRequest request, HttpServletResponse response, String value, Duration maxAge) {
        // 제공자 화면에서 돌아오는 최상위 이동(GET)에 쿠키가 실리도록 SameSite=Lax
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(request.isSecure())
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String sign(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingKey, "HmacSHA256"));
            return ENCODER.encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
