package com.devflow.task.dto;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.task.type.TaskSort;
import com.devflow.task.type.TaskStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

/**
 * GET /api/projects/{projectId}/tasks 검색 조건 (Backend-API-구현-목록 T1).
 * page는 0부터, size 기본 12 (Frontend 작업 보드 한 페이지), 최대 100.
 */
public record TaskSearchCondition(
        String keyword,
        TaskStatus status,
        Long assigneeId,
        TaskSort sort,
        int page,
        int size
) {

    public static final int DEFAULT_SIZE = 12;
    public static final int MAX_SIZE = 100;
    public static final int MAX_KEYWORD_LENGTH = 100;

    public static TaskSearchCondition of(
            String keyword,
            TaskStatus status,
            Long assigneeId,
            String sort,
            Integer page,
            Integer size
    ) {
        int pageValue = page == null ? 0 : page;
        int sizeValue = size == null ? DEFAULT_SIZE : size;

        if (pageValue < 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "page는 0 이상이어야 합니다.");
        }
        if (sizeValue < 1 || sizeValue > MAX_SIZE) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "size는 1~" + MAX_SIZE + " 사이여야 합니다.");
        }

        String trimmed = keyword == null ? null : keyword.trim();
        if (trimmed != null && trimmed.length() > MAX_KEYWORD_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "검색어는 " + MAX_KEYWORD_LENGTH + "자 이하여야 합니다.");
        }

        return new TaskSearchCondition(
                trimmed == null || trimmed.isEmpty() ? null : trimmed,
                status,
                assigneeId,
                TaskSort.from(sort),
                pageValue,
                sizeValue
        );
    }

    public Pageable toPageable() {
        return PageRequest.of(page, size, sort.sort());
    }

    /** statusCounts는 status 조건만 뺀 나머지 조건으로 센다 (FE 확인 2026-10-14) */
    public TaskSearchCondition withoutStatus() {
        return new TaskSearchCondition(keyword, null, assigneeId, sort, page, size);
    }
}
