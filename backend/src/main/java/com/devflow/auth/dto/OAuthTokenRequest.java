package com.devflow.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** X3: 소셜 로그인 콜백으로 받은 1회용 code */
public record OAuthTokenRequest(

        @NotBlank(message = "code는 필수입니다.")
        @Size(max = 200, message = "code가 올바르지 않습니다.")
        String code

) {
}
