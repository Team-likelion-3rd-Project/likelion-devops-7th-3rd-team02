package com.devflow.deployment.dto;

import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.type.DeploymentStatus;
import com.devflow.global.time.Times;

import java.time.OffsetDateTime;

/**
 * 배포 객체 (Backend-API-구현-목록 D1)
 * health: 가장 최근 배포(첫 페이지 첫 항목)에만 채운다. 그 환경의 Deployment 레플리카로 판정, 확인 불가면 null.
 */
public record DeploymentResponse(
        Long id,
        Integer revision,
        String imageTag,
        String imageDigest,
        String commitSha,
        String commitMessage,
        String environment,
        String service,
        DeploymentStatus status,
        OffsetDateTime deployedAt,
        String health
) {

    public DeploymentResponse withHealth(String value) {
        return new DeploymentResponse(id, revision, imageTag, imageDigest, commitSha, commitMessage,
                environment, service, status, deployedAt, value);
    }

    public static DeploymentResponse from(Deployment deployment) {
        return new DeploymentResponse(
                deployment.getId(),
                deployment.getRevision(),
                deployment.getImageTag(),
                deployment.getImageDigest(),
                deployment.getCommitSha(),
                deployment.getCommitMessage(),
                deployment.getEnvironment(),
                deployment.getService(),
                deployment.getStatus(),
                Times.toOffset(deployment.getDeployedAt()),
                null
        );
    }
}
