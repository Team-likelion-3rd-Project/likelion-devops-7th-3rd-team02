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
}
