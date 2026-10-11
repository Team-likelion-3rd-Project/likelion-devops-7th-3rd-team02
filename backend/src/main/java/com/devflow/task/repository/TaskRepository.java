package com.devflow.task.repository;

import com.devflow.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findAllByProjectIdOrderByCreatedAtDesc(Long projectId);
}