package com.devflow.auth.controller;

import com.devflow.auth.dto.LoginRequest;
import com.devflow.auth.dto.LoginResponse;
import com.devflow.auth.dto.OAuthTokenRequest;
import com.devflow.auth.oauth.OAuthLoginCodeService;
import com.devflow.auth.dto.SignupRequest;
import com.devflow.auth.dto.SignupResponse;
import com.devflow.auth.service.AuthService;
import com.devflow.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OAuthLoginCodeService oAuthLoginCodeService;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<SignupResponse>> signup(
            @Valid @RequestBody SignupRequest request
    ) {
        SignupResponse response = authService.signup(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "회원가입이 완료되었습니다.",
                                response
                        )
                );
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request
    ) {
        LoginResponse response = authService.login(request);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "로그인에 성공했습니다.",
                        response
                )
        );
    }

    /**
     * X3: 소셜 로그인 1회용 code → 로그인과 같은 { accessToken, tokenType }.
     * code는 60초, 1회만 사용. 만료·재사용이면 400 INVALID_OAUTH_CODE
     */
    @PostMapping("/oauth/token")
    public ResponseEntity<ApiResponse<LoginResponse>> exchangeOAuthCode(
            @Valid @RequestBody OAuthTokenRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "로그인에 성공했습니다.",
                        oAuthLoginCodeService.exchange(request.code())
                )
        );
    }
}
