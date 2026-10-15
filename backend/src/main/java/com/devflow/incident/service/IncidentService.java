package com.devflow.incident.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.incident.dto.IncidentAssigneeUpdateRequest;
import com.devflow.incident.dto.IncidentResponse;
import com.devflow.incident.dto.MyIncidentListResponse;
import com.devflow.incident.entity.Incident;
import com.devflow.incident.repository.IncidentRepository;
import com.devflow.incident.type.IncidentStatus;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.project.service.ProjectAccessChecker;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;

/** 장애 조회·확인·담당자·해결 (Backend-API-구현-목록 I1~I3, I6, I7) */
@Service
@RequiredArgsConstructor
public class IncidentService {

    /** 목록에 함께 보여 줄 최근 해결 장애 기간 */
    static final Duration RECENT_RESOLVED = Duration.ofHours(24);
    static final int MAX_ITEMS = 100;
    static final Collection<IncidentStatus> DEFAULT_MY_STATUSES =
            EnumSet.of(IncidentStatus.OPEN, IncidentStatus.ACKNOWLEDGED);

    private final IncidentRepository incidentRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ProjectAccessChecker projectAccessChecker;
    private final Clock clock;

    /** I1: 프로젝트 장애 (해결 전 + 최근 24시간 해결), 발생 최신순 */
    @Transactional(readOnly = true)
    public List<IncidentResponse> getIncidents(Long loginUserId, Long projectId) {
        projectAccessChecker.checkMember(projectId, loginUserId);
        return incidentRepository
                .findForProject(projectId, recentResolvedSince(), PageRequest.of(0, MAX_ITEMS))
                .stream()
                .map(IncidentResponse::from)
                .toList();
    }

    /** I7: 내가 팀원인 모든 프로젝트의 장애. status 생략 시 OPEN, ACKNOWLEDGED */
    @Transactional(readOnly = true)
    public MyIncidentListResponse getMyIncidents(Long loginUserId, List<IncidentStatus> statuses) {
        Collection<IncidentStatus> filter = statuses == null || statuses.isEmpty()
                ? DEFAULT_MY_STATUSES
                : EnumSet.copyOf(statuses);

        List<IncidentResponse> incidents = incidentRepository
                .findForUser(loginUserId, filter, recentResolvedSince(), PageRequest.of(0, MAX_ITEMS))
                .stream()
                .map(IncidentResponse::from)
                .toList();

        return new MyIncidentListResponse(incidentRepository.countOpenForUser(loginUserId), incidents);
    }

    /** I2: 확인. 이미 확인됨 → 200 그대로, 해결됨 → 409 */
    @Transactional
    public IncidentResponse acknowledge(Long loginUserId, Long projectId, Long incidentId) {
        Incident incident = getIncidentInProject(loginUserId, projectId, incidentId);
        incident.acknowledge(Times.now(clock));
        return flushed(incident);
    }

    /** I3: 담당자 변경 (팀원만) */
    @Transactional
    public IncidentResponse updateAssignee(
            Long loginUserId,
            Long projectId,
            Long incidentId,
            IncidentAssigneeUpdateRequest request
    ) {
        Incident incident = getIncidentInProject(loginUserId, projectId, incidentId);
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, request.assigneeId())) {
            throw new BusinessException(ErrorCode.INVALID_INCIDENT_ASSIGNEE);
        }
        User assignee = userRepository.findById(request.assigneeId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        incident.assignTo(assignee);
        return flushed(incident);
    }

    /** I6: 직접 해결. 알림이 울리는 중이어도 가능 (계속 울리면 새 장애로 다시 열림) */
    @Transactional
    public IncidentResponse resolve(Long loginUserId, Long projectId, Long incidentId) {
        Incident incident = getIncidentInProject(loginUserId, projectId, incidentId);
        incident.resolve(Times.now(clock));
        return flushed(incident);
    }

    private Incident getIncidentInProject(Long loginUserId, Long projectId, Long incidentId) {
        projectAccessChecker.checkMember(projectId, loginUserId);
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INCIDENT_NOT_FOUND));
        if (!incident.getProject().getId().equals(projectId)) {
            throw new BusinessException(ErrorCode.INCIDENT_NOT_FOUND);
        }
        return incident;
    }

    private IncidentResponse flushed(Incident incident) {
        incidentRepository.flush();
        return IncidentResponse.from(incident);
    }

    private LocalDateTime recentResolvedSince() {
        return Times.now(clock).minus(RECENT_RESOLVED);
    }
}
