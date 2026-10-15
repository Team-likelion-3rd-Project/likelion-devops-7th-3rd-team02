package com.devflow.incident.service;

import com.devflow.incident.dto.AlertmanagerWebhookRequest.Alert;
import com.devflow.incident.type.IncidentSeverity;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;
import java.util.Optional;

/**
 * Alertmanager 알림 → 장애 필드 변환 (Backend-API-구현-목록 I5, 13장 B-3 알림 규칙 기준)
 * labels: devflow_project_id, severity, alertname, metric_name(선택)
 * annotations: summary(제목), description(요약), current_value, threshold, unit
 */
final class AlertMapper {

    static final int TITLE_MAX = 200;
    static final int SUMMARY_MAX = 300;

    private AlertMapper() {
    }

    static Optional<Long> projectId(Alert alert) {
        String value = alert.label("devflow_project_id");
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(Long.parseLong(value));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    /** Alertmanager fingerprint가 없으면 alertname + 라벨로 대신한다 */
    static String fingerprint(Alert alert) {
        if (alert.fingerprint() != null && !alert.fingerprint().isBlank()) {
            return alert.fingerprint().trim();
        }
        return String.valueOf(alert.labels() == null ? "" : new java.util.TreeMap<>(alert.labels()).toString().hashCode());
    }

    static String title(Alert alert) {
        String title = Optional.ofNullable(alert.annotation("summary"))
                .or(() -> Optional.ofNullable(alert.label("alertname")))
                .orElse("이름 없는 알림");
        return truncate(title, TITLE_MAX);
    }

    static IncidentSeverity severity(Alert alert) {
        return IncidentSeverity.fromLabel(alert.label("severity"));
    }

    static Double number(Alert alert, String key) {
        String value = alert.annotation(key);
        if (value == null) {
            return null;
        }
        try {
            double parsed = Double.parseDouble(value);
            return Double.isFinite(parsed) ? parsed : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    static String metricName(Alert alert) {
        return Optional.ofNullable(alert.label("metric_name")).orElse(alert.label("alertname"));
    }

    static String unit(Alert alert) {
        String unit = alert.annotation("unit");
        return unit == null ? null : truncate(unit, 20);
    }

    /** description이 없으면 수치로 만든다. 예: "1.8s (기준 1.0s)" */
    static String summary(Alert alert, Double current, Double threshold, String unit) {
        String description = alert.annotation("description");
        if (description != null) {
            return truncate(description, SUMMARY_MAX);
        }
        if (current == null || threshold == null) {
            return null;
        }
        String suffix = unit == null ? "" : unit;
        return truncate(format(current) + suffix + " (기준 " + format(threshold) + suffix + ")", SUMMARY_MAX);
    }

    static String format(double value) {
        DecimalFormat format = new DecimalFormat("0.0##", DecimalFormatSymbols.getInstance(Locale.ROOT));
        return format.format(value);
    }

    static String truncate(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }
}
