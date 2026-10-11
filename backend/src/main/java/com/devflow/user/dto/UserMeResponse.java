package com.devflow.user.dto;

import com.devflow.user.entity.User;

public record UserMeResponse(
        Long userId,
        String email,
        String name
) {

    public static UserMeResponse from(User user) {
        return new UserMeResponse(
                user.getId(),
                user.getEmail(),
                user.getName()
        );
    }
}