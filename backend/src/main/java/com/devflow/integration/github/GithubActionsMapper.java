package com.devflow.integration.github;

import com.devflow.global.time.Times;
import com.devflow.integration.dto.IntegrationDtos;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * GitHub Actions 실행·Job → DevFlow 파이프라인 (C1 응답 형식은 GitLab 기준과 같게 유지).
 * 상태: PENDING / RUNNING / SUCCESS / FAILED (6.1을 GitHub 값에 맞춤)
 * 단계: Job 이름의 키워드로 BUILD·TEST·IMAGE·VERIFY·DEPLOY에 배정 (한 Job이 여러 단계에 걸칠 수 있음)
 */
public final class GithubActionsMapper {

    public static final String PENDING = "PENDING";
    public static final String RUNNING = "RUNNING";
    public static final String SUCCESS = "SUCCESS";
    public static final String FAILED = "FAILED";

    /** 화면 순서대로 */
    static final Map<String, List<String>> STAGE_KEYWORDS = new java.util.LinkedHashMap<>();

    static {
        STAGE_KEYWORDS.put("BUILD", List.of("build", "compile"));
        STAGE_KEYWORDS.put("TEST", List.of("test"));
        STAGE_KEYWORDS.put("IMAGE", List.of("image", "docker", "push", "ghcr", "ecr", "publish"));
        STAGE_KEYWORDS.put("VERIFY", List.of("verify", "scan", "smoke", "lint", "check", "trivy", "security"));
        STAGE_KEYWORDS.put("DEPLOY", List.of("deploy", "release", "argo", "gitops", "rollout"));
    }

    private GithubActionsMapper() {
    }

    /** status(queued·in_progress·completed…) + conclusion → DevFlow 상태 */
    public static String status(String status, String conclusion) {
        String s = status == null ? "" : status.toLowerCase(Locale.ROOT);
        if (!"completed".equals(s)) {
            return "in_progress".equals(s) ? RUNNING : PENDING;
        }
        String c = conclusion == null ? "" : conclusion.toLowerCase(Locale.ROOT);
        return switch (c) {
            case "success", "neutral" -> SUCCESS;
            case "skipped", "stale", "" -> PENDING;
            default -> FAILED; // failure, cancelled, timed_out, startup_failure, action_required
        };
    }

    public static IntegrationDtos.Pipeline pipeline(JsonNode run, JsonNode jobs) {
        String status = status(run.path("status").asText(null), run.path("conclusion").asText(null));
        boolean completed = "completed".equalsIgnoreCase(run.path("status").asText(""));
        return new IntegrationDtos.Pipeline(
                run.path("id").asLong(),
                run.path("run_number").asLong(),
                status,
                run.path("head_branch").asText(null),
                run.path("head_sha").asText(null),
                firstLine(run.path("head_commit").path("message").asText(null)),
                time(run.path("run_started_at")),
                completed ? time(run.path("updated_at")) : null,
                stages(jobs)
        );
    }

    static List<IntegrationDtos.PipelineStage> stages(JsonNode jobsResponse) {
        JsonNode jobs = jobsResponse == null ? null : jobsResponse.path("jobs");
        List<IntegrationDtos.PipelineStage> stages = new ArrayList<>();
        for (Map.Entry<String, List<String>> stage : STAGE_KEYWORDS.entrySet()) {
            List<JsonNode> matched = new ArrayList<>();
            if (jobs != null) {
                for (JsonNode job : jobs) {
                    String name = job.path("name").asText("").toLowerCase(Locale.ROOT);
                    if (stage.getValue().stream().anyMatch(name::contains)) {
                        matched.add(job);
                    }
                }
            }
            stages.add(stage(stage.getKey(), matched));
        }
        return stages;
    }

    private static IntegrationDtos.PipelineStage stage(String name, List<JsonNode> jobs) {
        if (jobs.isEmpty()) {
            return new IntegrationDtos.PipelineStage(name, PENDING, null, null);
        }
        boolean anyFailed = false;
        boolean anyRunning = false;
        boolean allSuccess = true;
        boolean allCompleted = true;
        OffsetDateTime started = null;
        OffsetDateTime finished = null;
        for (JsonNode job : jobs) {
            String s = status(job.path("status").asText(null), job.path("conclusion").asText(null));
            anyFailed |= FAILED.equals(s);
            anyRunning |= RUNNING.equals(s);
            allSuccess &= SUCCESS.equals(s);
            allCompleted &= "completed".equalsIgnoreCase(job.path("status").asText(""));
            OffsetDateTime jobStart = time(job.path("started_at"));
            OffsetDateTime jobEnd = time(job.path("completed_at"));
            if (jobStart != null && (started == null || jobStart.isBefore(started))) {
                started = jobStart;
            }
            if (jobEnd != null && (finished == null || jobEnd.isAfter(finished))) {
                finished = jobEnd;
            }
        }
        String status = anyFailed ? FAILED : anyRunning ? RUNNING : allSuccess ? SUCCESS : PENDING;
        return new IntegrationDtos.PipelineStage(name, status, started, allCompleted ? finished : null);
    }

    static OffsetDateTime time(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || node.asText().isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(node.asText()).atZoneSameInstant(Times.SEOUL).toOffsetDateTime();
        } catch (Exception e) {
            return null;
        }
    }

    static String firstLine(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        String line = message.strip().lines().findFirst().orElse("").strip();
        return line.length() > 300 ? line.substring(0, 300) : line;
    }
}
