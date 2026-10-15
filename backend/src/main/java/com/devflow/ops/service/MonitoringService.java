package com.devflow.ops.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.ops.config.OpsProperties;
import com.devflow.ops.dto.OpsDtos;
import com.devflow.ops.prometheus.PromPoint;
import com.devflow.ops.prometheus.PrometheusClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * O1 모니터링 요약·추이 (Backend-API-구현-목록 O1, 6.3 계산식). 30초 캐시.
 * 요청이 0건인 구간의 오류율·응답 시간은 0 (NaN 금지).
 */
@Service
@RequiredArgsConstructor
public class MonitoringService {

    static final Duration TTL = Duration.ofSeconds(30);
    static final int POINTS = 12;
    private static final Map<String, Duration> RANGES = Map.of(
            "1h", Duration.ofHours(1),
            "6h", Duration.ofHours(6),
            "24h", Duration.ofHours(24)
    );

    private final PrometheusClient prometheus;
    private final KubeStatusService kubeStatus;
    private final OpsProperties properties;
    private final Clock clock;

    public OpsDtos.MonitoringSummary summary(OpsProperties.Environment env, String range) {
        String rangeKey = range == null || range.isBlank() ? "1h" : range.trim();
        Duration duration = RANGES.get(rangeKey);
        if (duration == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "range는 1h, 6h, 24h 중 하나여야 합니다.");
        }
        Queries q = new Queries(properties.backendJob());
        String window = rangeKey;

        long count = Math.round(orZero(prometheus.scalar(env, q.requestCount(window), TTL)));
        double errorRate = round1(orZero(prometheus.scalar(env, q.errorRate(window), TTL)));
        double avgResponse = Math.round(orZero(prometheus.scalar(env, q.avgResponseMs(window), TTL)));
        double cpu = round1(orZero(prometheus.scalar(env, q.cpu(), TTL)));
        double memory = round1(orZero(prometheus.scalar(env, q.memory(), TTL)));
        OpsDtos.Replicas replicas = kubeStatus.backendReplicas(env).orElse(new OpsDtos.Replicas(0, 0));

        return new OpsDtos.MonitoringSummary(
                count,
                errorRate,
                avgResponse,
                cpu,
                memory,
                replicas,
                series(env, q, duration),
                Times.nowOffset(clock)
        );
    }

    private List<OpsDtos.MetricPoint> series(OpsProperties.Environment env, Queries q, Duration duration) {
        long step = duration.getSeconds() / POINTS;
        // 캐시가 맞도록 끝 시각을 30초 단위로 내림
        long end = clock.instant().getEpochSecond() / 30 * 30;
        long start = end - duration.getSeconds() + step;
        String window = step + "s";

        Map<Long, Double> errors = toMap(prometheus.range(env, q.errorRate(window), start, end, step, TTL));
        Map<Long, Double> response = toMap(prometheus.range(env, q.avgResponseMs(window), start, end, step, TTL));
        Map<Long, Double> cpu = toMap(prometheus.range(env, q.cpu(), start, end, step, TTL));
        Map<Long, Double> memory = toMap(prometheus.range(env, q.memory(), start, end, step, TTL));

        List<OpsDtos.MetricPoint> points = new ArrayList<>(POINTS);
        for (long t = start; t <= end; t += step) {
            points.add(new OpsDtos.MetricPoint(
                    Instant.ofEpochSecond(t).atZone(Times.SEOUL).toOffsetDateTime(),
                    round1(errors.getOrDefault(t, 0.0)),
                    Math.round(response.getOrDefault(t, 0.0)),
                    round1(cpu.getOrDefault(t, 0.0)),
                    round1(memory.getOrDefault(t, 0.0))
            ));
        }
        return points;
    }

    private static Map<Long, Double> toMap(List<PromPoint> points) {
        Map<Long, Double> map = new HashMap<>();
        for (PromPoint p : points) {
            if (p.value() != null) {
                map.put(p.epochSeconds(), p.value());
            }
        }
        return map;
    }

    private static double orZero(Double value) {
        return value == null ? 0 : value;
    }

    private static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }

    /** 6.3 PromQL. job 라벨은 설정값(devflow.ops.backend-job) */
    record Queries(String job) {

        private String sel(String extra) {
            return "{job=\"" + job + "\"" + extra + "}";
        }

        String requestCount(String window) {
            return "sum(increase(http_server_requests_seconds_count" + sel("") + "[" + window + "]))";
        }

        String errorRate(String window) {
            return "100 * (sum(rate(http_server_requests_seconds_count" + sel(",status=~\"5..\"") + "[" + window + "])) or vector(0))"
                    + " / sum(rate(http_server_requests_seconds_count" + sel("") + "[" + window + "]))";
        }

        String avgResponseMs(String window) {
            return "1000 * sum(rate(http_server_requests_seconds_sum" + sel("") + "[" + window + "]))"
                    + " / sum(rate(http_server_requests_seconds_count" + sel("") + "[" + window + "]))";
        }

        String cpu() {
            return "100 * avg(process_cpu_usage" + sel("") + ")";
        }

        String memory() {
            return "100 * avg(sum by (pod)(jvm_memory_used_bytes" + sel(",area=\"heap\"") + ")"
                    + " / sum by (pod)(jvm_memory_max_bytes" + sel(",area=\"heap\"") + "))";
        }
    }
}
