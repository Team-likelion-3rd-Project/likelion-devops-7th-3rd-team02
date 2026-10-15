package com.devflow.incident.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.devflow.incident.dto.AlertmanagerWebhookRequest.Alert;
import com.devflow.incident.type.IncidentSeverity;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AlertMapperTest {

    private Alert alert(Map<String, String> labels, Map<String, String> annotations) {
        return new Alert("firing", labels, annotations, null, null, "fp-1");
    }

    @Test
    void 프로젝트_라벨을_숫자로_읽고_없거나_잘못되면_비운다() {
        assertThat(AlertMapper.projectId(alert(Map.of("devflow_project_id", "7"), Map.of()))).contains(7L);
        assertThat(AlertMapper.projectId(alert(Map.of("devflow_project_id", "abc"), Map.of()))).isEmpty();
        assertThat(AlertMapper.projectId(alert(Map.of(), Map.of()))).isEmpty();
    }

    @Test
    void 제목은_summary_없으면_alertname() {
        assertThat(AlertMapper.title(alert(Map.of("alertname", "HighLatency"), Map.of("summary", "응답 지연"))))
                .isEqualTo("응답 지연");
        assertThat(AlertMapper.title(alert(Map.of("alertname", "HighLatency"), Map.of())))
                .isEqualTo("HighLatency");
    }

    @Test
    void description이_없으면_수치로_요약을_만든다() {
        Alert alert = alert(Map.of(), Map.of("current_value", "1.8", "threshold", "1", "unit", "s"));

        Double current = AlertMapper.number(alert, "current_value");
        Double threshold = AlertMapper.number(alert, "threshold");

        assertThat(AlertMapper.summary(alert, current, threshold, "s")).isEqualTo("1.8s (기준 1.0s)");
    }

    @Test
    void 숫자가_아닌_수치는_null() {
        Alert alert = alert(Map.of(), Map.of("current_value", "NaN", "threshold", "높음"));

        assertThat(AlertMapper.number(alert, "current_value")).isNull();
        assertThat(AlertMapper.number(alert, "threshold")).isNull();
        assertThat(AlertMapper.summary(alert, null, null, null)).isNull();
    }

    @Test
    void 심각도_라벨은_대소문자_무관_모르는_값은_WARNING() {
        assertThat(IncidentSeverity.fromLabel("Critical")).isEqualTo(IncidentSeverity.CRITICAL);
        assertThat(IncidentSeverity.fromLabel("info")).isEqualTo(IncidentSeverity.INFO);
        assertThat(IncidentSeverity.fromLabel("unknown")).isEqualTo(IncidentSeverity.WARNING);
        assertThat(IncidentSeverity.fromLabel(null)).isEqualTo(IncidentSeverity.WARNING);
    }
}
