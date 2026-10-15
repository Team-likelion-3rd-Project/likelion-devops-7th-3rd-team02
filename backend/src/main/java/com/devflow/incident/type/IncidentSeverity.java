package com.devflow.incident.type;

import java.util.Locale;

public enum IncidentSeverity {
    CRITICAL,
    WARNING,
    INFO;

    /** Alertmanager labels.severity (critical·warning·info, 대소문자 무관). 없거나 모르는 값은 WARNING */
    public static IncidentSeverity fromLabel(String label) {
        if (label == null || label.isBlank()) {
            return WARNING;
        }
        return switch (label.trim().toUpperCase(Locale.ROOT)) {
            case "CRITICAL", "PAGE", "ERROR" -> CRITICAL;
            case "INFO", "NONE" -> INFO;
            default -> WARNING;
        };
    }
}
