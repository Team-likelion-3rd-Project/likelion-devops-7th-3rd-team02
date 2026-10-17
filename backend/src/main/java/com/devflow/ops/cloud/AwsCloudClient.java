package com.devflow.ops.cloud;

import com.devflow.global.external.ExternalApiException;
import com.devflow.global.time.Times;
import com.devflow.ops.config.OpsProperties;
import com.devflow.ops.dto.OpsDtos;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.exception.ApiCallAttemptTimeoutException;
import software.amazon.awssdk.core.exception.ApiCallTimeoutException;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cloudwatch.CloudWatchClient;
import software.amazon.awssdk.services.cloudwatch.model.Dimension;
import software.amazon.awssdk.services.cloudwatch.model.GetMetricDataRequest;
import software.amazon.awssdk.services.cloudwatch.model.Metric;
import software.amazon.awssdk.services.cloudwatch.model.MetricDataQuery;
import software.amazon.awssdk.services.cloudwatch.model.MetricDataResult;
import software.amazon.awssdk.services.cloudwatch.model.MetricStat;
import software.amazon.awssdk.services.elasticloadbalancingv2.ElasticLoadBalancingV2Client;
import software.amazon.awssdk.services.elasticloadbalancingv2.model.TargetHealthDescription;
import software.amazon.awssdk.services.rds.RdsClient;
import software.amazon.awssdk.services.rds.model.DBInstance;
import software.amazon.awssdk.services.rds.model.DBSnapshot;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * AWS 읽기 전용 조회 (E4 RDS, E5 ALB). 자격 증명은 기본 체인(IRSA·인스턴스 프로파일).
 * 필요한 IAM: rds:DescribeDBInstances, rds:DescribeDBSnapshots,
 * elasticloadbalancing:DescribeTargetHealth, cloudwatch:GetMetricData
 */
@Slf4j
@Component
public class AwsCloudClient {

    private static final ClientOverrideConfiguration TIMEOUTS = ClientOverrideConfiguration.builder()
            .apiCallTimeout(Duration.ofSeconds(6))
            .apiCallAttemptTimeout(Duration.ofSeconds(3))
            .build();
    private static final Duration METRIC_WINDOW = Duration.ofMinutes(15);
    private static final double GB = 1024d * 1024 * 1024;

    private final Clock clock;
    private final Map<String, RdsClient> rdsClients = new ConcurrentHashMap<>();
    private final Map<String, CloudWatchClient> cloudWatchClients = new ConcurrentHashMap<>();
    private final Map<String, ElasticLoadBalancingV2Client> elbClients = new ConcurrentHashMap<>();

    public AwsCloudClient(Clock clock) {
        this.clock = clock;
    }

    public OpsDtos.DatabaseStatus database(OpsProperties.Aws aws) {
        String id = require(aws.rdsInstanceId(), "RDS 식별자(AWS_RDS_INSTANCE_ID)");
        return call(() -> {
            RdsClient rds = rdsClients.computeIfAbsent(aws.region(), r -> RdsClient.builder()
                    .region(Region.of(r)).credentialsProvider(DefaultCredentialsProvider.create())
                    .overrideConfiguration(TIMEOUTS).build());
            List<DBInstance> instances = rds.describeDBInstances(b -> b.dbInstanceIdentifier(id)).dbInstances();
            if (instances.isEmpty()) {
                throw ExternalApiException.error("RDS 인스턴스 '" + id + "'를 찾을 수 없습니다.");
            }
            DBInstance db = instances.get(0);
            Instant lastBackup = rds.describeDBSnapshots(b -> b.dbInstanceIdentifier(id).snapshotType("automated"))
                    .dbSnapshots().stream()
                    .map(DBSnapshot::snapshotCreateTime)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            Map<String, Double> metrics = latest(aws.region(), List.of(
                    query("cpu", "AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", id, "Average"),
                    query("conn", "AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", id, "Average"),
                    query("free", "AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", id, "Average")));

            Double freeGb = metrics.get("free") == null ? null : round2(metrics.get("free") / GB);
            Double usedGb = freeGb == null || db.allocatedStorage() == null ? null : round2(db.allocatedStorage() - freeGb);
            return new OpsDtos.DatabaseStatus(
                    "RDS",
                    db.dbInstanceIdentifier(),
                    "PostgreSQL " + Objects.toString(db.engineVersion(), ""),
                    normalizeStatus(db.dbInstanceStatus()),
                    db.multiAZ(),
                    round1(metrics.get("cpu")),
                    metrics.get("conn") == null ? null : (int) Math.round(metrics.get("conn")),
                    usedGb,
                    freeGb,
                    lastBackup == null ? null : lastBackup.atZone(Times.SEOUL).toOffsetDateTime(),
                    Times.nowOffset(clock));
        });
    }

    public OpsDtos.LoadBalancerStatus loadBalancer(OpsProperties.Aws aws) {
        String lbArn = require(aws.loadBalancerArn(), "ALB ARN(AWS_ALB_ARN)");
        String tgArn = require(aws.targetGroupArn(), "대상 그룹 ARN(AWS_ALB_TARGET_GROUP_ARN)");
        String dimension = loadBalancerDimension(lbArn);
        return call(() -> {
            ElasticLoadBalancingV2Client elb = elbClients.computeIfAbsent(aws.region(), r -> ElasticLoadBalancingV2Client.builder()
                    .region(Region.of(r)).credentialsProvider(DefaultCredentialsProvider.create())
                    .overrideConfiguration(TIMEOUTS).build());
            List<TargetHealthDescription> targets = elb.describeTargetHealth(b -> b.targetGroupArn(tgArn))
                    .targetHealthDescriptions();
            int healthy = (int) targets.stream()
                    .filter(t -> "healthy".equalsIgnoreCase(t.targetHealth().stateAsString()))
                    .count();

            Map<String, Double> metrics = latest(aws.region(), List.of(
                    query("req", "AWS/ApplicationELB", "RequestCount", "LoadBalancer", dimension, "Sum"),
                    query("t5xx", "AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", dimension, "Sum"),
                    query("e5xx", "AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", dimension, "Sum"),
                    query("rt", "AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", dimension, "Average")));

            Long errors = metrics.get("t5xx") == null && metrics.get("e5xx") == null ? null
                    : Math.round(orZero(metrics.get("t5xx")) + orZero(metrics.get("e5xx")));
            return new OpsDtos.LoadBalancerStatus(
                    "ALB",
                    dimension.split("/").length > 1 ? dimension.split("/")[1] : dimension,
                    healthy,
                    targets.size() - healthy,
                    metrics.get("req") == null ? null : Math.round(metrics.get("req")),
                    errors,
                    metrics.get("rt") == null ? null : (double) Math.round(metrics.get("rt") * 1000),
                    Times.nowOffset(clock));
        });
    }

    /** CloudWatch 지표의 가장 최근 값 (5분 단위, 최근 15분 중) */
    private Map<String, Double> latest(String region, List<MetricDataQuery> queries) {
        CloudWatchClient cloudWatch = cloudWatchClients.computeIfAbsent(region, r -> CloudWatchClient.builder()
                .region(Region.of(r)).credentialsProvider(DefaultCredentialsProvider.create())
                .overrideConfiguration(TIMEOUTS).build());
        Instant end = clock.instant();
        List<MetricDataResult> results = cloudWatch.getMetricData(GetMetricDataRequest.builder()
                .startTime(end.minus(METRIC_WINDOW))
                .endTime(end)
                .metricDataQueries(queries)
                .build()).metricDataResults();
        Map<String, Double> values = new HashMap<>();
        for (MetricDataResult result : results) {
            // 기본 정렬은 최신순
            if (!result.values().isEmpty()) {
                values.put(result.id(), result.values().get(0));
            }
        }
        return values;
    }

    private static MetricDataQuery query(String id, String namespace, String metric, String dimension, String value, String stat) {
        return MetricDataQuery.builder()
                .id(id)
                .returnData(true)
                .metricStat(MetricStat.builder()
                        .metric(Metric.builder()
                                .namespace(namespace)
                                .metricName(metric)
                                .dimensions(Dimension.builder().name(dimension).value(value).build())
                                .build())
                        .period(300)
                        .stat(stat)
                        .build())
                .build();
    }

    /** arn:aws:elasticloadbalancing:{region}:{account}:loadbalancer/app/{name}/{id} → app/{name}/{id} */
    static String loadBalancerDimension(String arn) {
        int index = arn.indexOf(":loadbalancer/");
        if (index < 0) {
            throw ExternalApiException.error("ALB ARN 형식이 올바르지 않습니다.");
        }
        return arn.substring(index + ":loadbalancer/".length());
    }

    /** available → AVAILABLE, backing-up → BACKING_UP */
    static String normalizeStatus(String status) {
        return status == null ? "UNKNOWN" : status.trim().toUpperCase(Locale.ROOT).replace('-', '_');
    }

    private static String require(String value, String name) {
        if (value == null || value.isBlank()) {
            throw ExternalApiException.error(name + "가 설정되지 않았습니다.");
        }
        return value.trim();
    }

    private static <T> T call(Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (ApiCallTimeoutException | ApiCallAttemptTimeoutException e) {
            throw ExternalApiException.timeout("AWS 응답이 늦어 정보를 가져오지 못했습니다.");
        } catch (SdkException e) {
            log.warn("aws call failed: {}", e.getMessage());
            throw ExternalApiException.error("AWS에서 정보를 가져오지 못했습니다.");
        }
    }

    private static double orZero(Double value) {
        return value == null ? 0 : value;
    }

    static Double round1(Double value) {
        return value == null ? null : Math.round(value * 10) / 10.0;
    }

    static Double round2(Double value) {
        return value == null ? null : Math.round(value * 100) / 100.0;
    }
}
