package com.devflow.deployment.dto;

import com.devflow.deployment.type.DeploymentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * POST /api/webhooks/deployments (Backend-API-구현-목록 D3)
 * 배포 시작 시 IN_PROGRESS, 검증이 끝나면 SUCCESS·FAILED로 한 번 더 보낸다 (같은 pipelineId+service면 갱신).
 */
public record DeploymentWebhookRequest(

        // 프로젝트 토큰으로 호출하면 생략 (토큰의 프로젝트). 서버 공용 토큰이면 필수
        Long projectId,

        @NotBlank(message = "environment는 필수입니다.")
        @Size(max = 30, message = "environment는 30자 이하여야 합니다.")
        String environment,

        @NotBlank(message = "service는 필수입니다.")
        @Size(max = 30, message = "service는 30자 이하여야 합니다.")
        String service,

        @NotBlank(message = "commitSha는 필수입니다.")
        @Pattern(regexp = "^[0-9a-fA-F]{7,40}$", message = "commitSha는 7~40자리 16진수여야 합니다.")
        String commitSha,

        // 길면 첫 줄 300자까지만 저장 (거절하지 않음)
        String commitMessage,

        @NotBlank(message = "imageTag는 필수입니다.")
        @Size(max = 100, message = "imageTag는 100자 이하여야 합니다.")
        String imageTag,

        // GitOps 배포(ON1)에서 기록하는 이미지 digest (선택)
        @Size(max = 100, message = "imageDigest는 100자 이하여야 합니다.")
        String imageDigest,

        Integer revision,

        @NotNull(message = "status는 필수입니다.")
        DeploymentStatus status,

        Long pipelineId,

        // 없으면 받은 시각
        OffsetDateTime deployedAt
) {

    public static final int COMMIT_MESSAGE_MAX = 300;

    /** 커밋 메시지는 제목 한 줄만, 300자까지 */
    public String commitTitle() {
        if (commitMessage == null || commitMessage.isBlank()) {
            return null;
        }
        String firstLine = commitMessage.strip().lines().findFirst().orElse("").strip();
        return firstLine.length() > COMMIT_MESSAGE_MAX ? firstLine.substring(0, COMMIT_MESSAGE_MAX) : firstLine;
    }
}
