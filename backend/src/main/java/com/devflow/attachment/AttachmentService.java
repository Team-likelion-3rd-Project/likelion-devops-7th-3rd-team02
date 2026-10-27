package com.devflow.attachment;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.global.time.Times;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.service.ProjectAccessChecker;
import com.devflow.task.entity.Task;
import com.devflow.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * 업무 첨부파일 A1~A4 (Backend-API-구현-목록 15장)
 * 조회·업로드·다운로드는 팀원, 삭제는 올린 사람 또는 OWNER.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttachmentService {

    static final int NAME_MAX = 255;
    static final int TYPE_MAX = 100;
    static final String DEFAULT_TYPE = "application/octet-stream";

    private final TaskAttachmentRepository repository;
    private final TaskRepository taskRepository;
    private final ProjectAccessChecker access;
    private final AttachmentStorage storage;
    private final AttachmentProperties properties;
    private final DownloadTokens tokens;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AttachmentDtos.AttachmentResponse> list(Long userId, Long projectId, Long taskId) {
        access.checkMember(projectId, userId);
        Task task = task(projectId, taskId);
        return repository.findByTaskIdOrderByIdAsc(task.getId()).stream()
                .map(AttachmentDtos.AttachmentResponse::from)
                .toList();
    }

    @Transactional
    public AttachmentDtos.AttachmentResponse upload(Long userId, Long projectId, Long taskId, MultipartFile file) {
        ProjectMember member = access.getMembership(projectId, userId);
        Task task = task(projectId, taskId);
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "빈 파일은 올릴 수 없습니다.");
        }
        if (repository.countByTaskId(task.getId()) >= properties.maxPerTask()) {
            throw new BusinessException(ErrorCode.ATTACHMENT_LIMIT_EXCEEDED,
                    "업무 하나에 첨부파일은 " + properties.maxPerTask() + "개까지 올릴 수 있습니다.");
        }

        String name = fileName(file.getOriginalFilename());
        String type = contentType(file.getContentType());
        String key = "projects/" + projectId + "/tasks/" + task.getId() + "/" + UUID.randomUUID();

        try (InputStream in = file.getInputStream()) {
            storage.put(key, in, file.getSize(), type);
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "파일을 읽지 못했습니다.");
        }
        try {
            TaskAttachment saved = repository.saveAndFlush(new TaskAttachment(
                    task, member.getUser(), name, type, file.getSize(), key, Times.now(clock)));
            return AttachmentDtos.AttachmentResponse.from(saved);
        } catch (RuntimeException e) {
            storage.delete(key);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public AttachmentDtos.DownloadResponse download(Long userId, Long projectId, Long taskId, Long attachmentId) {
        access.checkMember(projectId, userId);
        TaskAttachment attachment = attachment(projectId, taskId, attachmentId);
        return new AttachmentDtos.DownloadResponse(
                storage.downloadUrl(attachment, properties.downloadUrlTtl()).toString(),
                tokens.expiresAt(properties.downloadUrlTtl()).atZone(Times.SEOUL).toOffsetDateTime());
    }

    @Transactional
    public void delete(Long userId, Long projectId, Long taskId, Long attachmentId) {
        ProjectMember member = access.getMembership(projectId, userId);
        TaskAttachment attachment = attachment(projectId, taskId, attachmentId);
        boolean uploader = attachment.getUploader().getId().equals(userId);
        if (member.getRole() != ProjectRole.OWNER && !uploader) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "첨부파일은 올린 사람 또는 프로젝트 OWNER만 삭제할 수 있습니다.");
        }
        repository.delete(attachment);
        repository.flush();
        storage.delete(attachment.getStorageKey());
    }

    /** 업무 삭제(T7) 전에 호출: 저장소의 파일과 메타데이터를 함께 지운다 */
    @Transactional
    public void purgeTask(Long taskId) {
        List<TaskAttachment> attachments = repository.findByTaskIdOrderByIdAsc(taskId);
        if (attachments.isEmpty()) {
            return;
        }
        repository.deleteAll(attachments);
        repository.flush();
        attachments.forEach(a -> storage.delete(a.getStorageKey()));
    }

    /** 로컬 저장소 서명 주소 다운로드 */
    @Transactional(readOnly = true)
    public TaskAttachment byDownloadToken(String token) {
        Long id = tokens.verify(token).orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND,
                "다운로드 주소가 만료되었거나 올바르지 않습니다. 다시 받아 주세요."));
        return repository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
    }

    private TaskAttachment attachment(Long projectId, Long taskId, Long attachmentId) {
        Task task = task(projectId, taskId);
        return repository.findByIdAndTaskId(attachmentId, task.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
    }

    private Task task(Long projectId, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TASK_NOT_FOUND));
        if (!task.getProject().getId().equals(projectId)) {
            throw new BusinessException(ErrorCode.TASK_NOT_FOUND);
        }
        return task;
    }

    /** 경로 제거, 제어 문자 제거, 255자 제한 */
    static String fileName(String original) {
        String name = original == null ? "" : original;
        int slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        name = name.substring(slash + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty() || name.equals(".") || name.equals("..")) {
            name = "file";
        }
        return name.length() > NAME_MAX ? name.substring(name.length() - NAME_MAX) : name;
    }

    static String contentType(String type) {
        if (type == null || type.isBlank() || type.length() > TYPE_MAX || !type.matches("^[\\w.+-]+/[\\w.+-]+(;.*)?$")) {
            return DEFAULT_TYPE;
        }
        return type.trim();
    }
}
