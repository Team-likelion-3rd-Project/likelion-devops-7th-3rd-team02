package com.devflow.task.repository;

import com.devflow.task.entity.Task;
import com.devflow.task.type.TaskStatus;
import org.springframework.data.jpa.domain.Specification;

import java.util.Map;

public interface TaskRepositoryCustom {

    /** 조건에 맞는 업무의 상태별 건수. 없는 상태도 0으로 채운다 (GROUP BY status 한 번). */
    Map<TaskStatus, Long> countByStatus(Specification<Task> specification);
}
