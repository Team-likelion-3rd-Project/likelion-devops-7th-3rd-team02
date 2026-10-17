package com.devflow.cloud;

import com.devflow.project.entity.Project;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 프로젝트별 Webhook 토큰 (14.3). 원문은 저장하지 않고 SHA-256 해시만 */
@Getter
@Entity
@Table(name = "project_webhook_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectWebhookToken {

    public enum Type {
        DEPLOYMENT,
        ALERTMANAGER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Type type;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_used_at")
    private LocalDateTime lastUsedAt;

    public ProjectWebhookToken(Project project, Type type, String tokenHash, LocalDateTime createdAt) {
        this.project = project;
        this.type = type;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
    }

    public void rotate(String tokenHash, LocalDateTime now) {
        this.tokenHash = tokenHash;
        this.createdAt = now;
        this.lastUsedAt = null;
    }

    public void markUsed(LocalDateTime now) {
        this.lastUsedAt = now;
    }
}
