package com.devflow.task.type;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import org.springframework.data.domain.Sort;

import java.util.Arrays;

/**
 * 업무 목록 정렬 허용 값 (Backend-API-구현-목록 T1, Frontend TASK_SORT_OPTIONS).
 * 같은 값끼리 순서가 바뀌지 않도록 id를 두 번째 기준으로 둔다.
 */
public enum TaskSort {

    UPDATED_AT_DESC("updatedAt,desc", Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))),
    CREATED_AT_DESC("createdAt,desc", Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))),
    TITLE_ASC("title,asc", Sort.by(Sort.Order.asc("title"), Sort.Order.asc("id")));

    public static final TaskSort DEFAULT = UPDATED_AT_DESC;

    private final String value;
    private final Sort sort;

    TaskSort(String value, Sort sort) {
        this.value = value;
        this.sort = sort;
    }

    public String value() {
        return value;
    }

    public Sort sort() {
        return sort;
    }

    /** 비어 있으면 기본값(updatedAt,desc), 허용되지 않는 값이면 400 INVALID_REQUEST */
    public static TaskSort from(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT;
        }
        String normalized = value.replace(" ", "");
        return Arrays.stream(values())
                .filter(option -> option.value.equalsIgnoreCase(normalized))
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_REQUEST,
                        "sort는 updatedAt,desc, createdAt,desc, title,asc 중 하나여야 합니다."
                ));
    }
}
