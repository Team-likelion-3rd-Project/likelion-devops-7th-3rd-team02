package com.devflow.incident.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * Alertmanager webhook receiver 본문 (version 4). 쓰는 필드만 받는다.
 * https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AlertmanagerWebhookRequest(
        String status,
        List<Alert> alerts
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Alert(
            String status,
            Map<String, String> labels,
            Map<String, String> annotations,
            OffsetDateTime startsAt,
            OffsetDateTime endsAt,
            String fingerprint
    ) {

        public boolean isFiring() {
            return !"resolved".equalsIgnoreCase(status);
        }

        public String label(String key) {
            return labels == null ? null : blankToNull(labels.get(key));
        }

        public String annotation(String key) {
            return annotations == null ? null : blankToNull(annotations.get(key));
        }

        private static String blankToNull(String value) {
            return value == null || value.isBlank() ? null : value.trim();
        }
    }
}
