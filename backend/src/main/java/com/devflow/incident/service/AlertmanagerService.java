package com.devflow.incident.service;

import com.devflow.global.time.Times;
import com.devflow.incident.dto.AlertmanagerWebhookRequest;
import com.devflow.incident.dto.AlertmanagerWebhookRequest.Alert;
import com.devflow.incident.entity.Incident;
import com.devflow.incident.repository.IncidentRepository;
import com.devflow.cloud.ProjectEnvironments;
import com.devflow.project.entity.Project;
import com.devflow.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Alertmanager Webhook 처리 (Backend-API-구현-목록 I5)
 * - firing: 해결 전 같은 알림(fingerprint)이 있으면 갱신, 없으면 새 장애(OPEN)
 * - resolved: 해결 전 같은 알림이 있으면 firing=false (상태는 그대로, 자동 해결 규칙이 처리)
 * 프로젝트 토큰으로 받으면 그 프로젝트로 기록한다 (devflow_project_id 라벨이 다른 프로젝트면 건너뜀).
 * 서버 공용 토큰이면 devflow_project_id 라벨이 없거나 없는 프로젝트의 알림은 건너뛴다.
 * 환경: devflow_env 라벨, 없으면 프로젝트 기본 환경.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlertmanagerService {

    /** Alertmanager가 firing 알림에 넣는 "끝나지 않음" 값(0001-01-01)을 거르는 기준 */
    private static final int MIN_VALID_YEAR = 2000;

    private final IncidentRepository incidentRepository;
    private final ProjectRepository projectRepository;
    private final ProjectEnvironments environments;
    private final Clock clock;

    public record Result(int created, int updated, int skipped) {
    }

    @Transactional
    public Result handle(Long forcedProjectId, AlertmanagerWebhookRequest request) {
        int created = 0;
        int updated = 0;
        int skipped = 0;

        if (request.alerts() == null) {
            return new Result(0, 0, 0);
        }

        for (Alert alert : request.alerts()) {
            Optional<Project> project = target(forcedProjectId, alert).flatMap(projectRepository::findById);
            if (project.isEmpty()) {
                skipped++;
                log.warn("alert skipped (no devflow_project_id or unknown project): alertname={}",
                        alert.label("alertname"));
                continue;
            }

            String fingerprint = AlertMapper.fingerprint(alert);
            Optional<Incident> active = incidentRepository.findActive(project.get().getId(), fingerprint);

            if (alert.isFiring()) {
                Incident incident = active.orElseGet(() -> Incident.open(
                        project.get(),
                        fingerprint,
                        Optional.ofNullable(alert.label("devflow_env"))
                                .orElseGet(() -> environments.defaultName(project.get().getId())),
                        AlertMapper.severity(alert),
                        validTime(alert.startsAt()).orElse(Times.now(clock))
                ));
                describe(incident, alert);
                incident.markFiring();
                incidentRepository.save(incident);
                if (active.isPresent()) {
                    updated++;
                } else {
                    created++;
                }
            } else if (active.isPresent()) {
                Incident incident = active.get();
                incident.markFiringEnded(validTime(alert.endsAt()).orElse(Times.now(clock)));
                updated++;
            } else {
                skipped++;
            }
        }

        log.info("alertmanager webhook: created={}, updated={}, skipped={}", created, updated, skipped);
        return new Result(created, updated, skipped);
    }

    /** 알림이 기록될 프로젝트. 프로젝트 토큰이면 라벨이 같은 프로젝트를 가리킬 때만(또는 라벨 없음) */
    static Optional<Long> target(Long forcedProjectId, Alert alert) {
        Optional<Long> labeled = AlertMapper.projectId(alert);
        if (forcedProjectId == null) {
            return labeled;
        }
        if (labeled.isPresent() && !labeled.get().equals(forcedProjectId)) {
            return Optional.empty();
        }
        return Optional.of(forcedProjectId);
    }

    private static void describe(Incident incident, Alert alert) {
        Double current = AlertMapper.number(alert, "current_value");
        Double threshold = AlertMapper.number(alert, "threshold");
        String unit = AlertMapper.unit(alert);
        incident.describe(
                AlertMapper.title(alert),
                AlertMapper.severity(alert),
                AlertMapper.summary(alert, current, threshold, unit),
                AlertMapper.metricName(alert),
                current,
                threshold,
                unit
        );
    }

    private static Optional<LocalDateTime> validTime(OffsetDateTime time) {
        if (time == null || time.getYear() < MIN_VALID_YEAR) {
            return Optional.empty();
        }
        return Optional.of(Times.toSeoul(time));
    }
}
