package com.devflow.task.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.project.entity.Project;
import com.devflow.project.service.ProjectAccessChecker;
import com.devflow.task.dto.TaskAssigneeUpdateRequest;
import com.devflow.task.dto.TaskCreateRequest;
import com.devflow.task.dto.TaskListResponse;
import com.devflow.task.dto.TaskResponse;
import com.devflow.task.dto.TaskSearchCondition;
import com.devflow.task.dto.TaskStatusUpdateRequest;
import com.devflow.task.dto.TaskUpdateRequest;
import com.devflow.task.entity.Task;
import com.devflow.task.repository.TaskRepository;
import com.devflow.task.repository.TaskSpecifications;
import com.devflow.task.type.TaskStatus;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;
    private final ProjectAccessChecker projectAccessChecker;

    @Transactional
    public TaskResponse createTask(
            Long loginUserId,
            Long projectId,
            TaskCreateRequest request
    ) {

        Project project = projectAccessChecker.getProject(projectId);
        projectAccessChecker.checkMember(projectId, loginUserId);

        User assignee = null;

        if (request.assigneeId() != null) {
            assignee = getAssignableUser(projectId, request.assigneeId());
        }

        Task task = new Task(
                request.title(),
                request.description(),
                project,
                assignee
        );

        Task savedTask = taskRepository.save(task);

        return TaskResponse.from(savedTask);
    }

    /**
     * 업무 목록: 검색·필터·정렬·페이지 + 전체 건수 + 상태별 건수 (Backend-API-구현-목록 T1)
     */
    @Transactional(readOnly = true)
    public TaskListResponse getTasks(
            Long loginUserId,
            Long projectId,
            TaskSearchCondition condition
    ) {

        projectAccessChecker.checkMember(projectId, loginUserId);

        Page<Task> page = taskRepository.findAll(
                TaskSpecifications.search(projectId, condition),
                condition.toPageable()
        );

        Map<TaskStatus, Long> statusCounts = taskRepository.countByStatus(
                TaskSpecifications.search(projectId, condition.withoutStatus())
        );

        return new TaskListResponse(
                page.getContent().stream().map(TaskResponse::from).toList(),
                page.getTotalElements(),
                statusCounts
        );
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(
            Long loginUserId,
            Long projectId,
            Long taskId
    ) {

        projectAccessChecker.checkMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        return TaskResponse.from(task);
    }

    /** 제목·설명 수정 (T4). 상태·담당자는 전용 API를 쓴다. */
    @Transactional
    public TaskResponse updateTask(
            Long loginUserId,
            Long projectId,
            Long taskId,
            TaskUpdateRequest request
    ) {

        projectAccessChecker.checkMember(projectId, loginUserId);

        Task task = getTaskInProject(projectId, taskId);

        task.update(request.title(), request.normalizedDescription());

        return toFlushedResponse(task);
    }

    @Transactional
    public TaskResponse updateStatus(
            Long loginUserId,
            Long projectId,
            Long taskId,
            TaskStatusUpdateRequest request
    ) {

        projectAccessChecker.checkMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        task.changeStatus(request.status());

        return toFlushedResponse(task);
    }

    @Transactional
    public TaskResponse updateAssignee(
            Long loginUserId,
            Long projectId,
            Long taskId,
            TaskAssigneeUpdateRequest request
    ) {

        projectAccessChecker.checkMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        task.assignTo(getAssignableUser(projectId, request.assigneeId()));

        return toFlushedResponse(task);
    }

    /** 팀원만 담당자로 지정할 수 있다. 생성·변경 모두 400 INVALID_TASK_ASSIGNEE (API 명세 10.1 #3) */
    private User getAssignableUser(Long projectId, Long assigneeId) {
        if (!projectMemberRepository.existsByProjectIdAndUserId(projectId, assigneeId)) {
            throw new BusinessException(ErrorCode.INVALID_TASK_ASSIGNEE);
        }
        return userRepository.findById(assigneeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    /**
     * 수정 시각(updatedAt)은 flush 시점에 JPA Auditing이 채운다.
     * 응답에 바뀐 시각이 나가도록 먼저 flush한다 (작업 보드 기본 정렬이 updatedAt).
     */
    private TaskResponse toFlushedResponse(Task task) {
        taskRepository.flush();
        return TaskResponse.from(task);
    }

    private Task getTaskInProject(
            Long projectId,
            Long taskId
    ) {

        Task task = taskRepository
                .findById(taskId)
                .orElseThrow(
                        () -> new BusinessException(
                                ErrorCode.TASK_NOT_FOUND
                        )
                );

        if (!task.getProject().getId().equals(projectId)) {
            throw new BusinessException(
                    ErrorCode.TASK_NOT_FOUND
            );
        }

        return task;
    }
}
