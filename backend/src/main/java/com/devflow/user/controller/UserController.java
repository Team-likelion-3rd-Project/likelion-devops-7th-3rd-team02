package com.devflow.user.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.user.dto.UserMeResponse;
import com.devflow.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserMeResponse>> getMyInfo(
            Authentication authentication
    ) {

        Long userId = (Long) authentication.getPrincipal();

        UserMeResponse response = userService.getMyInfo(userId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "내 정보 조회에 성공했습니다.",
                        response
                )
        );
    }
}