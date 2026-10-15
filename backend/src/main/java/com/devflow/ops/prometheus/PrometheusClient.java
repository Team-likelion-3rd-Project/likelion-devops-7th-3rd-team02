package com.devflow.ops.prometheus;

import com.devflow.global.external.ExternalApiException;
import com.devflow.global.external.ExternalCache;
import com.devflow.global.external.ExternalHttp;
import com.devflow.ops.config.OpsProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Prometheus HTTP API (/api/v1/query, /api/v1/query_range) 조회.
 * POST form으로 보내 PromQL의 {, " 같은 문자를 그대로 전달하고, 응답 본문을 캐시한다.
 */
@Slf4j
@Component
public class PrometheusClient {

    private static final String SYSTEM = "Prometheus";

    private final RestClient restClient = ExternalHttp.restClient().build();
    private final ExternalCache cache;
    private final ObjectMapper objectMapper;

    public PrometheusClient(ExternalCache cache, ObjectMapper objectMapper) {
        this.cache = cache;
        this.objectMapper = objectMapper;
    }

    public List<PromSample> query(OpsProperties.Environment env, String promql, Duration ttl) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("query", promql);
        JsonNode result = post(env, "/api/v1/query", form, ttl);

        List<PromSample> samples = new ArrayList<>();
        for (JsonNode row : result) {
            samples.add(new PromSample(labels(row.path("metric")), number(row.path("value").path(1))));
        }
        return samples;
    }

    /** 단일 값 (결과가 여러 줄이면 첫 줄, 없으면 null) */
    public Double scalar(OpsProperties.Environment env, String promql, Duration ttl) {
        List<PromSample> samples = query(env, promql, ttl);
        return samples.isEmpty() ? null : samples.get(0).value();
    }

    /** range vector의 첫 시계열 점들 (없으면 빈 목록) */
    public List<PromPoint> range(
            OpsProperties.Environment env,
            String promql,
            long startEpoch,
            long endEpoch,
            long stepSeconds,
            Duration ttl
    ) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("query", promql);
        form.add("start", Long.toString(startEpoch));
        form.add("end", Long.toString(endEpoch));
        form.add("step", stepSeconds + "s");
        JsonNode result = post(env, "/api/v1/query_range", form, ttl);

        List<PromPoint> points = new ArrayList<>();
        if (result.isArray() && !result.isEmpty()) {
            for (JsonNode value : result.get(0).path("values")) {
                points.add(new PromPoint(value.path(0).asLong(), number(value.path(1))));
            }
        }
        return points;
    }

    private JsonNode post(OpsProperties.Environment env, String path, MultiValueMap<String, String> form, Duration ttl) {
        if (!env.hasPrometheus()) {
            throw ExternalApiException.error("'" + env.name() + "' 환경의 Prometheus 주소가 설정되지 않았습니다.");
        }
        String key = "prom:" + env.name() + ":" + path + ":" + form;
        String body = cache.get(key, ttl, () -> ExternalHttp.call(SYSTEM, () -> restClient.post()
                .uri(env.prometheusUrl() + path)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class)));
        try {
            JsonNode root = objectMapper.readTree(body);
            if (!"success".equals(root.path("status").asText())) {
                throw ExternalApiException.error("Prometheus 조회에 실패했습니다: " + root.path("error").asText(""));
            }
            return root.path("data").path("result");
        } catch (ExternalApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("prometheus response parse failed: {}", e.getMessage());
            throw ExternalApiException.error("Prometheus 응답을 읽지 못했습니다.");
        }
    }

    private static Map<String, String> labels(JsonNode metric) {
        Map<String, String> labels = new LinkedHashMap<>();
        metric.fields().forEachRemaining(e -> labels.put(e.getKey(), e.getValue().asText()));
        return labels;
    }

    /** "NaN", "+Inf" 등은 null */
    static Double number(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        try {
            double value = Double.parseDouble(node.asText());
            return Double.isFinite(value) ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
