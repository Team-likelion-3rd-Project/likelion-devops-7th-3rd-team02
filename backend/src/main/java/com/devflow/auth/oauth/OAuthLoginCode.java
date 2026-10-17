package com.devflow.auth.oauth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 소셜 로그인 1회용 code (60초, 1회). 원문은 저장하지 않고 SHA-256 해시만 */
@Getter
@Entity
@Table(name = "oauth_login_codes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OAuthLoginCode {

    @Id
    @Column(name = "code_hash", length = 64)
    private String codeHash;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public OAuthLoginCode(String codeHash, Long userId, LocalDateTime createdAt, LocalDateTime expiresAt) {
        this.codeHash = codeHash;
        this.userId = userId;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }
}
