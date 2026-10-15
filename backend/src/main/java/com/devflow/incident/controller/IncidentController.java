package com.devflow.incident.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.incident.dto.IncidentAssigneeUpdateRequest;
import com.devflow.incident.dto.IncidentResponse;
import com.devflow.incident.dto.MyIncidentListResponse;
import com.devflow.incident.service.IncidentService;
import com.devflow.incident.type.IncidentStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    /** I1: 프로젝트 장애 목록 (해결 전 + 최근 24시간 해결) */
    @GetMapping("/api/projects/{projectId}/incidents")
    public ResponseEntity<ApiResponse<List<IncidentResponse>>> getIncidents(
            Authentication authentication,
            @PathVariable Long projectId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "장애 목록 조회에 성공했습니다.",
                incidentService.getIncidents(userId(authentication), projectId)
        ));
    }

    /** I2: 장애 확인 */
    @PatchMapping("/api/projects/{projectId}/incidents/{incidentId}/ack")
    public ResponseEntity<ApiResponse<IncidentResponse>> acknowledge(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long incidentId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "장애를 확인했습니다.",
                incidentService.acknowledge(userId(authentication), projectId, incidentId)
        ));
    }

    /** I3: 장애 담당자 변경 */
    @PatchMapping("/api/projects/{projectId}/incidents/{incidentId}/assignee")
    public ResponseEntity<ApiResponse<IncidentResponse>> updateAssignee(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long incidentId,
            @Valid @RequestBody IncidentAssigneeUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "장애 담당자가 변경되었습니다.",
                incidentService.updateAssignee(userId(authentication), projectId, incidentId, request)
        ));
    }

    /** I6: 장애 해결 처리 */
    @PatchMapping("/api/projects/{projectId}/incidents/{incidentId}/resolve")
    public ResponseEntity<ApiResponse<IncidentResponse>> resolve(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long incidentId
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "장애를 해결 처리했습니다.",
                incidentService.resolve(userId(authentication), projectId, incidentId)
        ));
    }

    /** I7: 내가 팀원인 모든 프로젝트의 장애. status는 쉼표 구분(OPEN,ACKNOWLEDGED), 생략 시 해결 전 장애 */
    @GetMapping("/api/users/me/incidents")
    public ResponseEntity<ApiResponse<MyIncidentListResponse>> getMyIncidents(
            Authentication authentication,
            @RequestParam(required = false) List<IncidentStatus> status
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "전체 장애 조회에 성공했습니다.",
                incidentService.getMyIncidents(userId(authentication), status)
        ));
    }

    private static Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
