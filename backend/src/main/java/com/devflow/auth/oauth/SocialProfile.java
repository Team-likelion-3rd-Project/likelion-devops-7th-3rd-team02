package com.devflow.auth.oauth;

/** 제공자에서 받은 사용자 정보 (provider: GITHUB / GOOGLE) */
public record SocialProfile(
        String provider,
        String providerUserId,
        String login,
        String name,
        String email,
        boolean emailVerified
) {
}
