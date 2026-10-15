package com.devflow.incident.service;

import com.devflow.global.time.Times;
import com.devflow.incident.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 자동 해결 (확정 2026-10-14): 확인된 장애가 알림이 풀린 뒤 30분 동안 다시 울리지 않으면 RESOLVED.
 * 1분마다 실행. 일괄 UPDATE라 여러 Pod에서 동시에 돌아도 결과가 같다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class IncidentAutoResolver {

    private final IncidentRepository incidentRepository;
    private final Clock clock;

    @Value("${devflow.incident.auto-resolve-after:30m}")
    private Duration autoResolveAfter;

    @Scheduled(fixedDelayString = "${devflow.incident.auto-resolve-interval-ms:60000}",
            initialDelayString = "${devflow.incident.auto-resolve-interval-ms:60000}")
    public void run() {
        resolveStableIncidents();
    }

    /** 트랜잭션은 repository의 일괄 UPDATE 메서드가 연다 (스케줄러 호출이 프록시를 거치지 않아도 동작) */
    public int resolveStableIncidents() {
        LocalDateTime now = Times.now(clock);
        int resolved = incidentRepository.resolveStable(now.minus(autoResolveAfter), now);
        if (resolved > 0) {
            log.info("auto-resolved incidents: {}", resolved);
        }
        return resolved;
    }
}
