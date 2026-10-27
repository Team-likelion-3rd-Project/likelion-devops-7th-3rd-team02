package com.devflow.deployment.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.deployment.dto.DeploymentWebhookRequest;
import com.devflow.deployment.entity.Deployment;
import com.devflow.deployment.type.DeploymentStatus;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class DeploymentSameReleaseTest {

    private static Deployment existing(Long pipelineId, String commit, String tag, String digest) {
        Deployment d = new Deployment(null, "backend", pipelineId);
        d.record("dev", commit, null, tag, digest, null, DeploymentStatus.SUCCESS, LocalDateTime.now());
        return d;
    }

    private static DeploymentWebhookRequest request(String commit, String tag, String digest) {
        return new DeploymentWebhookRequest(null, "dev", "backend", commit, null, tag, digest, null,
                DeploymentStatus.SUCCESS, null, null);
    }

    @Test
    void 커밋과_digest가_같으면_같은_릴리스() {
        assertThat(DeploymentService.sameRelease(existing(null, "7f3c2a1", "7f3c2a1", "sha256:a"),
                request("7F3C2A1", "other-tag", "sha256:a"))).isTrue();
    }

    @Test
    void digest가_없으면_태그로_비교한다() {
        assertThat(DeploymentService.sameRelease(existing(null, "7f3c2a1", "v1", null), request("7f3c2a1", "v1", null))).isTrue();
        assertThat(DeploymentService.sameRelease(existing(null, "7f3c2a1", "v1", null), request("7f3c2a1", "v2", null))).isFalse();
    }

    @Test
    void 커밋이나_digest가_다르거나_pipelineId_기록이면_다른_릴리스() {
        assertThat(DeploymentService.sameRelease(existing(null, "7f3c2a1", "v1", "sha256:a"), request("9a8b7c6", "v1", "sha256:a"))).isFalse();
        assertThat(DeploymentService.sameRelease(existing(null, "7f3c2a1", "v1", "sha256:a"), request("7f3c2a1", "v1", "sha256:b"))).isFalse();
        assertThat(DeploymentService.sameRelease(existing(101L, "7f3c2a1", "v1", "sha256:a"), request("7f3c2a1", "v1", "sha256:a"))).isFalse();
    }
}
