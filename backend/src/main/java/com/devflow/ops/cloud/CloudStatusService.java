package com.devflow.ops.cloud;

import com.devflow.cloud.ProjectEnvironments;
import com.devflow.global.external.ExternalApiException;
import com.devflow.global.external.ExternalCache;
import com.devflow.global.time.Times;
import com.devflow.ops.config.CloudEnvironment;
import com.devflow.ops.dto.OpsDtos;
import com.devflow.ops.prometheus.PrometheusClient;
import com.devflow.ops.service.KubeStatusService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

/**
 * E4 DB 상태, E5 로드밸런서 상태 (Backend-API-구현-목록 12장)
 * - AWS 환경(devflow.ops.environments[n].aws.region 설정): RDS·ALB API + CloudWatch
 * - 그 외(온프레미스): Prometheus — postgres_exporter, kube-state-metrics(백업 CronJob), Traefik 지표
 * 결과는 30초 캐시. 조회 실패는 502/504.
 */
@Service
@RequiredArgsConstructor
public class CloudStatusService {

    static final Duration TTL = Duration.ofSeconds(30);
    private static final double GB = 1024d * 1024 * 1024;

    private final AwsCloudClient aws;
    private final PrometheusClient prometheus;
    private final KubeStatusService kubeStatus;
    private final ExternalCache cache;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public OpsDtos.DatabaseStatus database(CloudEnvironment env) {
        return cached("cloud:db:" + env.key(), OpsDtos.DatabaseStatus.class,
                () -> env.hasAws() ? aws.database(env.aws()) : databaseFromPrometheus(ProjectEnvironments.requirePrometheus(env)));
    }

    public OpsDtos.LoadBalancerStatus loadBalancer(CloudEnvironment env) {
        return cached("cloud:lb:" + env.key(), OpsDtos.LoadBalancerStatus.class,
                () -> env.hasAws() ? aws.loadBalancer(env.aws()) : loadBalancerFromPrometheus(ProjectEnvironments.requirePrometheus(env)));
    }

    /** 온프렘 PostgreSQL: postgres_exporter + 백업 CronJob 마지막 성공 시각. CPU·남은 공간은 지표가 없어 null */
    OpsDtos.DatabaseStatus databaseFromPrometheus(CloudEnvironment env) {
        Double up = prometheus.scalar(env, "max(pg_up)", TTL);
        Double connections = prometheus.scalar(env, "sum(pg_stat_database_numbackends)", TTL);
        Double sizeBytes = prometheus.scalar(env, "sum(pg_database_size_bytes)", TTL);
        Double lastBackup = prometheus.scalar(env,
                "max(kube_cronjob_status_last_successful_time{namespace=\"" + env.namespace() + "\",cronjob=~\".*backup.*\"})", TTL);

        String status = up == null ? "UNKNOWN" : up >= 1 ? "AVAILABLE" : "UNAVAILABLE";
        return new OpsDtos.DatabaseStatus(
                "PROMETHEUS",
                null,
                "PostgreSQL",
                status,
                null,
                null,
                connections == null ? null : (int) Math.round(connections),
                sizeBytes == null ? null : AwsCloudClient.round2(sizeBytes / GB),
                null,
                lastBackup == null || lastBackup <= 0 ? null
                        : Instant.ofEpochSecond(lastBackup.longValue()).atZone(Times.SEOUL).toOffsetDateTime(),
                Times.nowOffset(clock));
    }

    /** 온프렘 Traefik: 최근 5분 요청·5xx·평균 응답 시간, 대상 = 네임스페이스 Deployment 준비 레플리카 */
    OpsDtos.LoadBalancerStatus loadBalancerFromPrometheus(CloudEnvironment env) {
        String service = "service=~\"" + env.namespace() + "-.*\"";
        Double requests = prometheus.scalar(env,
                "sum(increase(traefik_service_requests_total{" + service + "}[5m]))", TTL);
        Double errors = prometheus.scalar(env,
                "sum(increase(traefik_service_requests_total{" + service + ",code=~\"5..\"}[5m]))", TTL);
        Double avgSeconds = prometheus.scalar(env,
                "sum(rate(traefik_service_request_duration_seconds_sum{" + service + "}[5m]))"
                        + " / sum(rate(traefik_service_request_duration_seconds_count{" + service + "}[5m]))", TTL);

        int ready = 0;
        int desired = 0;
        for (OpsDtos.K8sDeployment d : kubeStatus.deployments(env).deployments()) {
            ready += d.readyReplicas();
            desired += d.desiredReplicas();
        }
        return new OpsDtos.LoadBalancerStatus(
                "PROMETHEUS",
                "traefik",
                ready,
                Math.max(0, desired - ready),
                requests == null ? null : Math.round(requests),
                fiveXx(requests, errors),
                avgSeconds == null ? null : (double) Math.round(avgSeconds * 1000),
                Times.nowOffset(clock));
    }

    /** 5xx 지표가 아예 없으면(5xx가 한 번도 없었던 경우) 요청 수가 있을 때 0 */
    static Long fiveXx(Double requests, Double errors) {
        if (errors != null) {
            return Math.round(errors);
        }
        return requests == null ? null : Long.valueOf(0L);
    }

    private <T> T cached(String key, Class<T> type, Supplier<T> loader) {
        String json = cache.get(key, TTL, () -> {
            try {
                return objectMapper.writeValueAsString(loader.get());
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                throw ExternalApiException.error("상태 정보를 처리하지 못했습니다.");
            }
        });
        try {
            // 캐시에서 다시 읽을 때 +09:00 오프셋을 UTC(Z)로 바꾸지 않도록
            return objectMapper.readerFor(type)
                    .without(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
                    .readValue(json);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw ExternalApiException.error("상태 정보를 처리하지 못했습니다.");
        }
    }
}
