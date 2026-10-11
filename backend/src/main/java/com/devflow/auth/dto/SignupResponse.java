package com.devflow.auth.dto;

import com.devflow.user.entity.User;

public record SignupResponse(
        Long userId,
        String email,
        String name
) {

    public static SignupResponse from(User user) {
        return new SignupResponse(
                user.getId(),
                user.getEmail(),
                user.getName()
        );
    }
}