package com.devflow.task.repository;

import com.devflow.task.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface TaskRepository extends JpaRepository<Task, Long>,
        JpaSpecificationExecutor<Task>,
        TaskRepositoryCustom {

    /** 목록 응답의 assigneeName 때문에 담당자를 함께 가져온다 (업무마다 추가 조회 방지). */
    @Override
    @EntityGraph(attributePaths = "assignee")
    Page<Task> findAll(Specification<Task> specification, Pageable pageable);
}
