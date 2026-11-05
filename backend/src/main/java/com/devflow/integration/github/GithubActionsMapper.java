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
 * 단계: BUILD·TEST·IMAGE·VERIFY·DEPLOY
 * - Job에 Step 정보가 있으면 Step 이름으로 배정한다. 한 Job 안의 빌드·배포 단계를 따로 보여 주기 위해서다.
 *   (예: "Build and publish to S3" Job에서 Build 성공 · AWS 인증 실패 → BUILD 성공, DEPLOY 실패)
 * - 키워드는 단어 단위로 비교한다 ("deployment settings"는 DEPLOY가 아니다).
 * - 키워드가 없는 Step(Checkout, Install 등)은 같은 Job의 다음(없으면 이전) 키워드 Step 단계를 따른다.
 * - 건너뛴(skipped) Step은 그 단계의 다른 Step이 있으면 집계에서 뺀다. 모두 건너뛰었으면 PENDING.
 * - Step 정보가 없으면(대기 중 Job 등) Job 이름으로 배정하며, 한 Job이 여러 단계에 걸칠 수 있다.
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
        STAGE_KEYWORDS.put("TEST", List.of("test", "tests"));
        STAGE_KEYWORDS.put("IMAGE", List.of("image", "images", "docker", "ghcr", "ecr", "publish"));
        STAGE_KEYWORDS.put("VERIFY", List.of("verify", "scan", "smoke", "lint", "check", "trivy", "security", "require"));
        STAGE_KEYWORDS.put("DEPLOY", List.of("deploy", "release", "argo", "gitops", "rollout",
                "s3", "cloudfront", "aws", "kubectl", "helm"));
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
        Map<String, List<JsonNode>> byStage = new java.util.LinkedHashMap<>();
        STAGE_KEYWORDS.keySet().forEach(stage -> byStage.put(stage, new ArrayList<>()));
        if (jobs != null) {
            for (JsonNode job : jobs) {
                assign(job, byStage);
            }
        }
        List<IntegrationDtos.PipelineStage> stages = new ArrayList<>();
        byStage.forEach((stage, items) -> stages.add(stage(stage, items)));
        return stages;
    }

    /** Job 하나를 단계에 배정. Step이 있으면 Step 단위, 없으면 Job 이름 단위 */
    private static void assign(JsonNode job, Map<String, List<JsonNode>> byStage) {
        List<JsonNode> steps = new ArrayList<>();
        for (JsonNode step : job.path("steps")) {
            if (!housekeeping(step.path("name").asText(""))) {
                steps.add(step);
            }
        }
        List<List<String>> matched = new ArrayList<>();
        boolean anyMatched = false;
        for (JsonNode step : steps) {
            List<String> stagesOfStep = stagesOf(step.path("name").asText(""));
            matched.add(stagesOfStep);
            anyMatched |= !stagesOfStep.isEmpty();
        }
        if (!anyMatched) {
            for (String stage : stagesOf(job.path("name").asText(""))) {
                byStage.get(stage).add(job);
            }
            return;
        }
        for (int i = 0; i < steps.size(); i++) {
            List<String> target = matched.get(i);
            for (int j = i + 1; target.isEmpty() && j < steps.size(); j++) {
                target = matched.get(j);
            }
            for (int j = i - 1; target.isEmpty() && j >= 0; j--) {
                target = matched.get(j);
            }
            for (String stage : target) {
                byStage.get(stage).add(steps.get(i));
            }
        }
    }

    /** 이름의 단어 중 키워드와 같은 것이 있는 단계들 (화면 순서) */
    static List<String> stagesOf(String name) {
        java.util.Set<String> words = new java.util.HashSet<>(
                List.of(name.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")));
        List<String> result = new ArrayList<>();
        STAGE_KEYWORDS.forEach((stage, keywords) -> {
            if (keywords.stream().anyMatch(words::contains)) {
                result.add(stage);
            }
        });
        return result;
    }

    /** GitHub가 자동으로 넣는 준비·정리 Step */
    private static boolean housekeeping(String name) {
        return name.equals("Set up job") || name.equals("Complete job") || name.startsWith("Post ");
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
        List<JsonNode> counted = jobs.stream().filter(job -> !skipped(job)).toList();
        if (counted.isEmpty()) {
            return new IntegrationDtos.PipelineStage(name, PENDING, null, null);
        }
        for (JsonNode job : counted) {
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

    private static boolean skipped(JsonNode item) {
        return "skipped".equalsIgnoreCase(item.path("conclusion").asText(""));
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
