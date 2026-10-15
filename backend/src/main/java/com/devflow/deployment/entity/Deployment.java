package com.devflow.deployment.entity;

import com.devflow.deployment.type.DeploymentStatus;
import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.project.entity.Project;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** CI·GitOps 배포 검증 단계가 D3 Webhook으로 보낸 배포 기록 (ERD 4.5) */
@Getter
@Entity
@Table(name = "deployments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Deployment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 30)
    private String environment;

    @Column(nullable = false, length = 30)
    private String service;

    @Column(name = "commit_sha", nullable = false, length = 40)
    private String commitSha;

    @Column(name = "commit_message", length = 300)
    private String commitMessage;

    @Column(name = "image_tag", nullable = false, length = 100)
    private String imageTag;

    @Column(name = "image_digest", length = 100)
    private String imageDigest;

    private Integer revision;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeploymentStatus status;

    @Column(name = "pipeline_id")
    private Long pipelineId;

    @Column(name = "deployed_at", nullable = false)
    private LocalDateTime deployedAt;

    public Deployment(Project project, String service, Long pipelineId) {
        this.project = project;
        this.service = service;
        this.pipelineId = pipelineId;
    }

    /** 같은 파이프라인의 시작·완료 기록은 한 행을 갱신한다 */
    public void record(
            String environment,
            String commitSha,
            String commitMessage,
            String imageTag,
            String imageDigest,
            Integer revision,
            DeploymentStatus status,
            LocalDateTime deployedAt
    ) {
        this.environment = environment;
        this.commitSha = commitSha;
        this.commitMessage = commitMessage;
        this.imageTag = imageTag;
        if (imageDigest != null) {
            this.imageDigest = imageDigest;
        }
        if (revision != null) {
            this.revision = revision;
        }
        this.status = status;
        this.deployedAt = deployedAt;
    }
}
