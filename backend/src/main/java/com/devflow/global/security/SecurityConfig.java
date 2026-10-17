package com.devflow.global.security;

import com.devflow.auth.oauth.ConfiguredProvidersAuthorizationRequestResolver;
import com.devflow.auth.oauth.CookieAuthorizationRequestRepository;
import com.devflow.auth.oauth.DevflowOAuth2UserService;
import com.devflow.auth.oauth.OAuthLoginHandlers;
import com.devflow.global.jwt.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JsonAuthenticationEntryPoint authenticationEntryPoint;
    private final JsonAccessDeniedHandler accessDeniedHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final OAuth2AuthorizedClientRepository authorizedClientRepository;
    private final CookieAuthorizationRequestRepository authorizationRequestRepository;
    private final DevflowOAuth2UserService oAuth2UserService;
    private final OAuthLoginHandlers oAuthLoginHandlers;

    /**
     * 브라우저에서 Backend를 직접 호출할 수 있는 Frontend 주소 목록 (쉼표 구분).
     * 같은 도메인의 /api 프록시(Vite, Nginx, Ingress)로 호출하면 CORS가 필요 없지만,
     * Frontend와 Backend 주소가 다른 환경을 위해 허용 목록을 둔다.
     */
    @Value("${devflow.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                // REST API + JWT 방식이므로 CSRF 비활성화
                .csrf(csrf -> csrf.disable())

                // 아래 corsConfigurationSource() 설정 사용 (Preflight 요청은 인증 전에 처리됨)
                .cors(Customizer.withDefaults())

                // JWT를 사용하므로 서버에서 Session을 생성하지 않음
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // 인증 실패 → 401 JSON, 접근 거부 → 403 JSON
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )

                // API 접근 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/**",
                                // 소셜 로그인 시작·콜백 (X1, X2). Frontend 주소를 거쳐 들어온다
                                "/oauth2/**",
                                "/login/oauth2/**",
                                // CI·Alertmanager가 호출. JWT 대신 Webhook 공유 토큰을 컨트롤러에서 확인
                                "/api/webhooks/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/actuator/health/**",
                                "/actuator/prometheus"
                        ).permitAll()
                        .anyRequest().authenticated()
                )

                // 소셜 로그인 (X1~X3): 세션 대신 서명 쿠키에 진행 상태 저장, 결과는 Frontend 콜백으로 리다이렉트
                .oauth2Login(oauth -> oauth
                        .clientRegistrationRepository(clientRegistrationRepository)
                        .authorizedClientRepository(authorizedClientRepository)
                        .authorizationEndpoint(endpoint -> endpoint
                                .authorizationRequestRepository(authorizationRequestRepository)
                                .authorizationRequestResolver(
                                        new ConfiguredProvidersAuthorizationRequestResolver(clientRegistrationRepository)))
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                        .successHandler(oAuthLoginHandlers)
                        .failureHandler(oAuthLoginHandlers)
                )

                // UsernamePasswordAuthenticationFilter보다
                // JWT 인증 Filter를 먼저 실행
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(parseOrigins(allowedOrigins));
        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        );
        configuration.setAllowedHeaders(
                List.of("Authorization", "Content-Type")
        );
        // 인증은 Authorization 헤더(Bearer)로만 하고 쿠키를 쓰지 않는다.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    static List<String> parseOrigins(String origins) {
        if (origins == null || origins.isBlank()) {
            return List.of();
        }
        return Arrays.stream(origins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }
}
