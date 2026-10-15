package com.devflow.integration.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

/** G1·G2 저장소 연결, C1 파이프라인 (Frontend types/integration.ts, types/pipeline.ts) */
public final class IntegrationDtos {

    private IntegrationDtos() {
    }

    public record GithubConnectRequest(
            @NotBlank(message = "저장소 주소는 필수입니다.")
            @Size(max = 300, message = "저장소 주소가 너무 깁니다.")
            String repositoryUrl
    ) {
    }

    public record GithubRepository(String fullName, String url) {

        public static GithubRepository of(String fullName) {
            return new GithubRepository(fullName, "https://github.com/" + fullName);
        }
    }

    public record PipelineStage(
            String name,
            String status,
            OffsetDateTime startedAt,
            OffsetDateTime finishedAt
    ) {
    }

    public record Pipeline(
            long id,
            long number,
            String status,
            String branch,
            String commitSha,
            String commitMessage,
            OffsetDateTime startedAt,
            OffsetDateTime finishedAt,
            List<PipelineStage> stages
    ) {
    }

    public record PipelineList(List<Pipeline> pipelines, long totalCount, OffsetDateTime collectedAt) {
    }
}
