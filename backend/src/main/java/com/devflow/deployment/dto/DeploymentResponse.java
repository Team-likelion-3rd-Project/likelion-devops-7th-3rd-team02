package com.devflow.deployment.dto;

import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.type.DeploymentStatus;
import com.devflow.global.time.Times;

import java.time.OffsetDateTime;

/**
 * 배포 객체 (Backend-API-구현-목록 D1)
 * health: 가장 최근 배포에만 채운다. Kubernetes 조회(BE-C) 전까지는 null.
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
