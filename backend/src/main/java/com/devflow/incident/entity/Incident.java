package com.devflow.incident.entity;

import com.devflow.global.entity.BaseTimeEntity;
import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.incident.type.IncidentStatus;
import com.devflow.project.entity.Project;
import com.devflow.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 장애 (ERD 4.3). Alertmanager 알림 하나(fingerprint)가 해결 전까지 장애 하나가 된다.
 * 상태 규칙 (Backend-API-구현-목록 I1~I3, I6):
 * - 알림 울림 → OPEN, 알림 풀림 → firing=false (상태는 그대로)
 * - ACKNOWLEDGED + 알림 풀린 지 30분 → 자동 RESOLVED (OPEN은 자동으로 닫지 않음)
 * - 해결 뒤 같은 알림이 다시 울리면 새 장애
 */
@Getter
@Entity
@Table(name = "incidents")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Incident extends BaseTimeEntity {

    public static final String SOURCE_ALERTMANAGER = "Alertmanager";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IncidentSeverity severity;

    @Column(nullable = false, length = 30)
    private String source;

    @Column(nullable = false, length = 255)
    private String fingerprint;

    /** 장애가 난 환경 (dev, production). 환경 요약(E1)에서 사용 */
    @Column(length = 30)
    private String environment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignee_id")
    private User assignee;

    @Column(length = 300)
    private String summary;

    @Column(name = "metric_name", length = 100)
    private String metricName;

    @Column(name = "metric_current_value")
    private Double metricCurrentValue;

    @Column(name = "metric_threshold")
    private Double metricThreshold;

    @Column(name = "metric_unit", length = 20)
    private String metricUnit;

    @Column(nullable = false)
    private boolean firing;

    @Column(name = "firing_ended_at")
    private LocalDateTime firingEndedAt;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public static Incident open(
            Project project,
            String fingerprint,
            String environment,
            IncidentSeverity severity,
            LocalDateTime occurredAt
    ) {
        Incident incident = new Incident();
        incident.project = project;
        incident.fingerprint = fingerprint;
        incident.environment = environment;
        incident.severity = severity;
        incident.source = SOURCE_ALERTMANAGER;
        incident.status = IncidentStatus.OPEN;
        incident.firing = true;
        incident.occurredAt = occurredAt;
        return incident;
    }

    /** 알림 내용(제목·요약·수치·심각도)은 알림이 올 때마다 최신 값으로 */
    public void describe(
            String title,
            IncidentSeverity severity,
            String summary,
            String metricName,
            Double metricCurrentValue,
            Double metricThreshold,
            String metricUnit
    ) {
        this.title = title;
        this.severity = severity;
        this.summary = summary;
        this.metricName = metricName;
        this.metricCurrentValue = metricCurrentValue;
        this.metricThreshold = metricThreshold;
        this.metricUnit = metricUnit;
    }

    public void markFiring() {
        this.firing = true;
        this.firingEndedAt = null;
    }

    public void markFiringEnded(LocalDateTime endedAt) {
        this.firing = false;
        this.firingEndedAt = endedAt;
    }

    /** I2: 이미 확인된 장애는 그대로 성공(먼저 확인한 시각 유지), 해결된 장애는 409 */
    public void acknowledge(LocalDateTime now) {
        requireNotResolved();
        if (status == IncidentStatus.OPEN) {
            status = IncidentStatus.ACKNOWLEDGED;
            acknowledgedAt = now;
        }
    }

    public void assignTo(User assignee) {
        requireNotResolved();
        this.assignee = assignee;
    }

    /** I6: 사람이 직접 해결. 알림이 울리는 중이어도 가능 */
    public void resolve(LocalDateTime now) {
        requireNotResolved();
        status = IncidentStatus.RESOLVED;
        resolvedAt = now;
    }

    private void requireNotResolved() {
        if (status == IncidentStatus.RESOLVED) {
            throw new BusinessException(ErrorCode.INVALID_INCIDENT_STATUS);
        }
    }
}
