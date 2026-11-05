package com.devflow.integration.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import com.devflow.integration.dto.IntegrationDtos;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

class GithubMappingTest {

    @Test
    void 저장소_주소에서_owner_repo를_꺼낸다() {
        assertThat(GithubRepositoryPath.parse("https://github.com/team02/devflow")).isEqualTo("team02/devflow");
        assertThat(GithubRepositoryPath.parse("https://github.com/team02/devflow.git")).isEqualTo("team02/devflow");
        assertThat(GithubRepositoryPath.parse(" https://github.com/Team-likelion/devflow.api/ ")).isEqualTo("Team-likelion/devflow.api");
    }

    @Test
    void GitHub_주소가_아니면_400() {
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://gitlab.com/team02/devflow")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://github.com/team02")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://github.com/team02/devflow/issues")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse(null)).isInstanceOf(BusinessException.class);
    }

    @Test
    void Actions_상태를_DevFlow_상태로_바꾼다() {
        assertThat(GithubActionsMapper.status("queued", null)).isEqualTo("PENDING");
        assertThat(GithubActionsMapper.status("in_progress", null)).isEqualTo("RUNNING");
        assertThat(GithubActionsMapper.status("completed", "success")).isEqualTo("SUCCESS");
        assertThat(GithubActionsMapper.status("completed", "failure")).isEqualTo("FAILED");
        assertThat(GithubActionsMapper.status("completed", "cancelled")).isEqualTo("FAILED");
        assertThat(GithubActionsMapper.status("completed", "skipped")).isEqualTo("PENDING");
    }

    @Test
    void 커밋_메시지는_첫_줄만() {
        assertThat(GithubActionsMapper.firstLine("feat: 검색\n\n본문")).isEqualTo("feat: 검색");
        assertThat(GithubActionsMapper.firstLine(null)).isNull();
    }

    private static Map<String, String> stageStatus(String jobsJson) throws Exception {
        JsonNode jobs = new ObjectMapper().readTree(jobsJson);
        Map<String, String> result = new LinkedHashMap<>();
        for (IntegrationDtos.PipelineStage stage : GithubActionsMapper.stages(jobs)) {
            result.put(stage.name(), stage.status());
        }
        return result;
    }

    private static String step(String name, String conclusion) {
        return "{\"name\":\"" + name + "\",\"status\":\"completed\",\"conclusion\":\"" + conclusion + "\"}";
    }

    @Test
    void 한_Job_안의_빌드_성공_배포_실패를_Step_단위로_나눈다() throws Exception {
        // Deploy Frontend 실제 결과: 사전 검사·Lint·Build 성공 → AWS 인증 실패 → S3 배포 건너뜀
        String jobs = "{\"jobs\":["
                + "{\"name\":\"Verify branch and deployment settings\",\"status\":\"completed\",\"conclusion\":\"success\",\"steps\":["
                + step("Set up job", "success") + "," + step("Require an approved deployment branch", "success") + ","
                + step("Require deployment settings", "success") + "," + step("Complete job", "success") + "]},"
                + "{\"name\":\"Build and publish to S3 + CloudFront\",\"status\":\"completed\",\"conclusion\":\"failure\",\"steps\":["
                + step("Run actions/checkout@v4", "success") + "," + step("Install", "success") + ","
                + step("Lint", "success") + "," + step("Build", "success") + ","
                + step("Configure AWS credentials", "failure") + "," + step("Verify assumed identity", "skipped") + ","
                + step("Sync to S3 and invalidate CloudFront", "skipped") + "," + step("Record deployment in summary", "skipped") + ","
                + step("Post Configure AWS credentials", "success") + "]}"
                + "]}";

        assertThat(stageStatus(jobs)).containsExactly(
                Map.entry("BUILD", "SUCCESS"),
                Map.entry("TEST", "PENDING"),
                Map.entry("IMAGE", "PENDING"),
                Map.entry("VERIFY", "SUCCESS"),
                Map.entry("DEPLOY", "FAILED"));
    }

    @Test
    void 단계_키워드는_단어_단위로_비교한다() {
        assertThat(GithubActionsMapper.stagesOf("Verify branch and deployment settings")).containsExactly("VERIFY");
        assertThat(GithubActionsMapper.stagesOf("Backend Build & Test")).containsExactly("BUILD", "TEST");
        assertThat(GithubActionsMapper.stagesOf("Push GitOps release commit")).containsExactly("DEPLOY");
        assertThat(GithubActionsMapper.stagesOf("Install")).isEmpty();
    }

    @Test
    void Step_정보가_없으면_Job_이름으로_배정한다() throws Exception {
        String jobs = "{\"jobs\":["
                + "{\"name\":\"Backend Build & Test\",\"status\":\"completed\",\"conclusion\":\"failure\"},"
                + "{\"name\":\"Deploy (GitOps)\",\"status\":\"queued\",\"conclusion\":null}"
                + "]}";

        assertThat(stageStatus(jobs)).containsExactly(
                Map.entry("BUILD", "FAILED"),
                Map.entry("TEST", "FAILED"),
                Map.entry("IMAGE", "PENDING"),
                Map.entry("VERIFY", "PENDING"),
                Map.entry("DEPLOY", "PENDING"));
    }
}
