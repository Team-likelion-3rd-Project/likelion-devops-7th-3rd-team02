package com.devflow.incident.repository;

import com.devflow.incident.entity.Incident;
import com.devflow.incident.type.IncidentSeverity;
import com.devflow.incident.type.IncidentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    /** 해결 전 장애 중 같은 알림 (부분 UNIQUE 인덱스 uk_incidents_active_fingerprint) */
    @Query("""
            select i from Incident i
            where i.project.id = :projectId and i.fingerprint = :fingerprint
              and i.status <> com.devflow.incident.type.IncidentStatus.RESOLVED
            """)
    Optional<Incident> findActive(@Param("projectId") Long projectId, @Param("fingerprint") String fingerprint);

    /** I1: 해결 전 장애 + 최근 해결(resolvedSince 이후), 발생 최신순 */
    @Query("""
            select i from Incident i
            join fetch i.project
            where i.project.id = :projectId
              and (i.status <> com.devflow.incident.type.IncidentStatus.RESOLVED or i.resolvedAt >= :resolvedSince)
            order by i.occurredAt desc, i.id desc
            """)
    List<Incident> findForProject(
            @Param("projectId") Long projectId,
            @Param("resolvedSince") LocalDateTime resolvedSince,
            Pageable pageable
    );

    /** I7: 내가 팀원인 모든 프로젝트의 장애. RESOLVED는 resolvedSince 이후만 */
    @Query("""
            select i from Incident i
            join fetch i.project
            where i.project.id in (select pm.project.id from ProjectMember pm where pm.user.id = :userId)
              and i.status in :statuses
              and (i.status <> com.devflow.incident.type.IncidentStatus.RESOLVED or i.resolvedAt >= :resolvedSince)
            order by i.occurredAt desc, i.id desc
            """)
    List<Incident> findForUser(
            @Param("userId") Long userId,
            @Param("statuses") Collection<IncidentStatus> statuses,
            @Param("resolvedSince") LocalDateTime resolvedSince,
            Pageable pageable
    );

    /** 사이드바 배지: 내 프로젝트 전체의 OPEN 건수 */
    @Query("""
            select count(i) from Incident i
            where i.project.id in (select pm.project.id from ProjectMember pm where pm.user.id = :userId)
              and i.status = com.devflow.incident.type.IncidentStatus.OPEN
            """)
    long countOpenForUser(@Param("userId") Long userId);

    /** E1: 환경별 해결 전 장애의 심각도 목록 (건수·health 판정용) */
    @Query("""
            select i.severity from Incident i
            where i.project.id = :projectId and i.environment = :environment
              and i.status <> com.devflow.incident.type.IncidentStatus.RESOLVED
            """)
    List<IncidentSeverity> findOpenSeverities(@Param("projectId") Long projectId, @Param("environment") String environment);

    /**
     * 자동 해결: 확인됨(ACKNOWLEDGED) + 알림이 풀린 지 기준 시간 이상 + 확인한 지도 기준 시간 이상.
     * (아무도 확인하지 않은 OPEN은 닫지 않는다. 풀린 뒤 확인했다면 확인 시점부터 센다)
     * 여러 Pod가 동시에 실행해도 같은 결과인 일괄 UPDATE.
     */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Incident i
            set i.status = com.devflow.incident.type.IncidentStatus.RESOLVED,
                i.resolvedAt = :now,
                i.updatedAt = :now
            where i.status = com.devflow.incident.type.IncidentStatus.ACKNOWLEDGED
              and i.firing = false
              and i.firingEndedAt <= :cutoff
              and i.acknowledgedAt <= :cutoff
            """)
    int resolveStable(@Param("cutoff") LocalDateTime cutoff, @Param("now") LocalDateTime now);
}
