package com.devflow.ops.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.external.ExternalApiException;
import org.junit.jupiter.api.Test;

class CloudMappingTest {

    @Test
    void ALB_ARN에서_CloudWatch_차원값을_꺼낸다() {
        assertThat(AwsCloudClient.loadBalancerDimension(
                "arn:aws:elasticloadbalancing:ap-northeast-2:123456789012:loadbalancer/app/devflow-alb/50dc6c495c0c9188"))
                .isEqualTo("app/devflow-alb/50dc6c495c0c9188");
        assertThatThrownBy(() -> AwsCloudClient.loadBalancerDimension("arn:aws:elasticloadbalancing:x:y:targetgroup/a/b"))
                .isInstanceOf(ExternalApiException.class);
    }

    @Test
    void RDS_상태는_대문자_밑줄로() {
        assertThat(AwsCloudClient.normalizeStatus("available")).isEqualTo("AVAILABLE");
        assertThat(AwsCloudClient.normalizeStatus("backing-up")).isEqualTo("BACKING_UP");
        assertThat(AwsCloudClient.normalizeStatus(null)).isEqualTo("UNKNOWN");
    }

    @Test
    void 오류_지표가_없으면_요청이_있을_때만_0() {
        assertThat(CloudStatusService.fiveXx(100.0, null)).isZero();
        assertThat(CloudStatusService.fiveXx(null, null)).isNull();
        assertThat(CloudStatusService.fiveXx(100.0, 2.6)).isEqualTo(3L);
    }

    @Test
    void 캐시에서_다시_읽어도_시각의_오프셋을_유지한다() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper()
                .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        java.time.OffsetDateTime seoul = java.time.OffsetDateTime.parse("2026-10-16T09:00:00+09:00");
        String json = mapper.writeValueAsString(new com.devflow.ops.dto.OpsDtos.DatabaseStatus(
                "PROMETHEUS", null, "PostgreSQL", "AVAILABLE", null, null, 8, 0.05, null, seoul, seoul));

        com.devflow.ops.dto.OpsDtos.DatabaseStatus read = mapper.readerFor(com.devflow.ops.dto.OpsDtos.DatabaseStatus.class)
                .without(com.fasterxml.jackson.databind.DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
                .readValue(json);

        assertThat(read.lastBackupAt().toString()).isEqualTo("2026-10-16T09:00+09:00");
    }
}
