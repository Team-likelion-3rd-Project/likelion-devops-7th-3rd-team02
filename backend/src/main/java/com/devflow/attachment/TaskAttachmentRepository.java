package com.devflow.attachment;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TaskAttachmentRepository extends JpaRepository<TaskAttachment, Long> {

    @EntityGraph(attributePaths = "uploader")
    List<TaskAttachment> findByTaskIdOrderByIdAsc(Long taskId);

    @EntityGraph(attributePaths = "uploader")
    Optional<TaskAttachment> findByIdAndTaskId(Long id, Long taskId);

    long countByTaskId(Long taskId);
}
