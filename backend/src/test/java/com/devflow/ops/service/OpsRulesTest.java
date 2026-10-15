package com.devflow.ops.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.incident.type.IncidentSeverity;
import com.devflow.ops.dto.OpsDtos;
import java.util.List;
import org.junit.jupiter.api.Test;

class OpsRulesTest {

    @Test
    void health는_레플리카와_열린_장애로_판정한다() {
        assertThat(HealthRule.of(new OpsDtos.Replicas(2, 2), List.of())).isEqualTo("HEALTHY");
        assertThat(HealthRule.of(new OpsDtos.Replicas(1, 2), List.of())).isEqualTo("DEGRADED");
        assertThat(HealthRule.of(new OpsDtos.Replicas(2, 2), List.of(IncidentSeverity.WARNING))).isEqualTo("DEGRADED");
        assertThat(HealthRule.of(new OpsDtos.Replicas(0, 2), List.of())).isEqualTo("DOWN");
        assertThat(HealthRule.of(new OpsDtos.Replicas(2, 2), List.of(IncidentSeverity.CRITICAL))).isEqualTo("DOWN");
    }

    @Test
    void 이미지는_레지스트리와_digest를_뺀다() {
        assertThat(KubeStatusService.shortImage("ghcr.io/team02/backend:7f3c2a1")).isEqualTo("backend:7f3c2a1");
        assertThat(KubeStatusService.shortImage("ghcr.io/team02/backend:7f3c2a1@sha256:abc")).isEqualTo("backend:7f3c2a1");
        assertThat(KubeStatusService.shortImage("nginx:1.27")).isEqualTo("nginx:1.27");
        assertThat(KubeStatusService.shortImage(null)).isNull();
    }

    @Test
    void 퍼센트는_소수점_한_자리() {
        assertThat(KubeStatusService.round1(55.04)).isEqualTo(55.0);
        assertThat(KubeStatusService.round1(null)).isNull();
    }
}
