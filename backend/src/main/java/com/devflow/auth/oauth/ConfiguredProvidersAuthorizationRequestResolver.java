package com.devflow.auth.oauth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * 설정되지 않은 제공자(/oauth2/authorization/google 등)는 500 대신 그냥 통과시켜
 * OAuthFallbackController가 Frontend 콜백(error=oauth_failed)으로 돌려보내게 한다.
 */
public class ConfiguredProvidersAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    static final String BASE_URI = "/oauth2/authorization";

    private final ClientRegistrationRepository registrations;
    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    public ConfiguredProvidersAuthorizationRequestResolver(ClientRegistrationRepository registrations) {
        this.registrations = registrations;
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(registrations, BASE_URI);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        String registrationId = registrationId(request);
        if (registrationId == null || registrations.findByRegistrationId(registrationId) == null) {
            return null;
        }
        return delegate.resolve(request);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        if (clientRegistrationId == null || registrations.findByRegistrationId(clientRegistrationId) == null) {
            return null;
        }
        return delegate.resolve(request, clientRegistrationId);
    }

    static String registrationId(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String prefix = BASE_URI + "/";
        if (!path.startsWith(prefix)) {
            return null;
        }
        String id = path.substring(prefix.length());
        return id.isEmpty() || id.contains("/") ? null : id;
    }
}
