package com.devflow.task.repository;

import com.devflow.task.dto.TaskSearchCondition;
import com.devflow.task.entity.Task;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** 업무 목록 검색 조건 → JPA Criteria 조건. 목록·건수·상태별 건수가 같은 조건을 쓴다. */
public final class TaskSpecifications {

    private static final char ESCAPE = '\\';

    private TaskSpecifications() {
    }

    public static Specification<Task> search(Long projectId, TaskSearchCondition condition) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("project").get("id"), projectId));

            if (condition.status() != null) {
                predicates.add(cb.equal(root.get("status"), condition.status()));
            }
            if (condition.assigneeId() != null) {
                predicates.add(cb.equal(root.get("assignee").get("id"), condition.assigneeId()));
            }
            if (condition.keyword() != null) {
                // 제목 부분 일치, 대소문자 무시. %, _ 는 검색어 그대로 찾도록 이스케이프
                String pattern = "%" + escapeLike(condition.keyword().toLowerCase(Locale.ROOT)) + "%";
                predicates.add(cb.like(cb.lower(root.<String>get("title")), pattern, ESCAPE));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }
}
