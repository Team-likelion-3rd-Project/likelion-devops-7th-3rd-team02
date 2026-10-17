package com.devflow.incident.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.incident.dto.AlertmanagerWebhookRequest.Alert;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AlertmanagerServiceTargetTest {

    private static Alert alert(Map<String, String> labels) {
        return new Alert("firing", labels, Map.of(), null, null, "fp");
    }

    @Test
    void 서버_공용_토큰은_라벨의_프로젝트() {
        assertThat(AlertmanagerService.target(null, alert(Map.of("devflow_project_id", "3")))).contains(3L);
        assertThat(AlertmanagerService.target(null, alert(Map.of("alertname", "x")))).isEmpty();
    }

    @Test
    void 프로젝트_토큰은_라벨이_없어도_그_프로젝트() {
        assertThat(AlertmanagerService.target(7L, alert(Map.of("alertname", "x")))).contains(7L);
        assertThat(AlertmanagerService.target(7L, alert(Map.of("devflow_project_id", "7")))).contains(7L);
    }

    @Test
    void 프로젝트_토큰으로_다른_프로젝트_알림은_건너뛴다() {
        assertThat(AlertmanagerService.target(7L, alert(Map.of("devflow_project_id", "8")))).isEmpty();
    }
}
