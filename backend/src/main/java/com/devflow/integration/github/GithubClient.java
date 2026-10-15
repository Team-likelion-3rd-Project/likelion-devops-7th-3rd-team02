package com.devflow.integration.github;

import com.devflow.global.external.ExternalApiException;
import com.devflow.global.external.ExternalCache;
import com.devflow.global.external.ExternalHttp;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Optional;

/**
 * GitHub REST API (저장소 확인, Actions 실행·Job 조회).
 * 토큰: 서버 공용 GITHUB_TOKEN(Secret, 선택). 없으면 공개 저장소만, 시간당 호출 수가 적다.
 */
@Component
public class GithubClient {

    private static final String SYSTEM = "GitHub";

    private final RestClient restClient;
    private final ExternalCache cache;
    private final ObjectMapper objectMapper;

    public GithubClient(
            @Value("${devflow.github.api-url:https://api.github.com}") String apiUrl,
            @Value("${devflow.github.token:}") String token,
            ExternalCache cache,
            ObjectMapper objectMapper
    ) {
        RestClient.Builder builder = ExternalHttp.restClient()
                .baseUrl(apiUrl.replaceAll("/+$", ""))
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28");
        if (token != null && !token.isBlank()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token.trim());
        }
        this.restClient = builder.build();
        this.cache = cache;
        this.objectMapper = objectMapper;
    }

    /** 저장소가 있고 읽을 수 있으면 정식 이름(owner/repo), 404·401·403이면 empty */
    public Optional<String> findRepository(String fullName) {
        String body = ExternalHttp.call(SYSTEM, () -> restClient.get()
                .uri("/repos/" + fullName)
                .exchange((request, response) -> {
                    HttpStatusCode status = response.getStatusCode();
                    if (status.value() == 404 || status.value() == 401 || status.value() == 403) {
                        return null;
                    }
                    if (status.isError()) {
                        throw ExternalApiException.error("GitHub 응답 오류(" + status.value() + ")로 저장소를 확인하지 못했습니다.");
                    }
                    return new String(response.getBody().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }));
        if (body == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(read(body).path("full_name").asText(null)).or(() -> Optional.of(fullName));
    }

    /** GET /repos/{repo}/actions/runs (workflow를 주면 그 workflow만). page는 1부터 */
    public JsonNode workflowRuns(String fullName, String workflow, int page, int perPage, Duration ttl) {
        String path = (workflow == null || workflow.isBlank())
                ? "/repos/" + fullName + "/actions/runs"
                : "/repos/" + fullName + "/actions/workflows/" + workflow.trim() + "/runs";
        String uri = path + "?per_page=" + perPage + "&page=" + page;
        return read(cached("gh:" + uri, ttl, uri));
    }

    /** GET /repos/{repo}/actions/runs/{id}/jobs */
    public JsonNode runJobs(String fullName, long runId, Duration ttl) {
        String uri = "/repos/" + fullName + "/actions/runs/" + runId + "/jobs?per_page=100";
        return read(cached("gh:" + uri, ttl, uri));
    }

    private String cached(String key, Duration ttl, String uri) {
        return cache.get(key, ttl, () -> ExternalHttp.call(SYSTEM, () -> restClient.get()
                .uri(uri)
                .retrieve()
                .body(String.class)));
    }

    private JsonNode read(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (Exception e) {
            throw ExternalApiException.error("GitHub 응답을 읽지 못했습니다.");
        }
    }
}
