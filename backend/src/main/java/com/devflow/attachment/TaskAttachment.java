package com.devflow.attachment;

import com.devflow.task.entity.Task;
import com.devflow.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** 업무 첨부파일 메타데이터 (V8). 파일 본문은 {@link AttachmentStorage}에 storageKey로 저장 */
@Getter
@Entity
@Table(name = "task_attachments")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaskAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id", nullable = false)
    private User uploader;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(name = "storage_key", nullable = false, length = 300)
    private String storageKey;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public TaskAttachment(Task task, User uploader, String originalName, String contentType,
                          long sizeBytes, String storageKey, LocalDateTime createdAt) {
        this.task = task;
        this.projectId = task.getProject().getId();
        this.uploader = uploader;
        this.originalName = originalName;
        this.contentType = contentType;
        this.sizeBytes = sizeBytes;
        this.storageKey = storageKey;
        this.createdAt = createdAt;
    }
}
