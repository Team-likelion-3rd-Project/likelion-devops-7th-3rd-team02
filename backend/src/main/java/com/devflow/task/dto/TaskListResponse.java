package com.devflow.task.dto;

import com.devflow.task.type.TaskStatus;

import java.util.List;
import java.util.Map;

/**
 * 업무 목록 응답 (Backend-API-구현-목록 T1, FE 확인 2026-10-14)
 * - totalCount: status를 포함한 모든 조건의 전체 건수 (페이지 표시)
 * - statusCounts: status 조건만 뺀 나머지 조건의 상태별 건수 (작업 보드 칸 제목), 세 상태 모두 포함
 */
public record TaskListResponse(
        List<TaskResponse> tasks,
        long totalCount,
        Map<TaskStatus, Long> statusCounts
) {
}
