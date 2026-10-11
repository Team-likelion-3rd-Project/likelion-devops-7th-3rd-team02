package com.devflow.task.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.project.entity.Project;
import com.devflow.project.repository.ProjectRepository;
import com.devflow.task.dto.TaskAssigneeUpdateRequest;
import com.devflow.task.dto.TaskCreateRequest;
import com.devflow.task.dto.TaskResponse;
import com.devflow.task.dto.TaskStatusUpdateRequest;
import com.devflow.task.entity.Task;
import com.devflow.task.repository.TaskRepository;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TaskResponse createTask(
            Long loginUserId,
            Long projectId,
            TaskCreateRequest request
    ) {

        Project project = getProject(projectId);

        validateProjectMember(projectId, loginUserId);

        User assignee = null;

        if (request.assigneeId() != null) {
            validateProjectMember(
                    projectId,
                    request.assigneeId()
            );

            assignee = userRepository
                    .findById(request.assigneeId())
                    .orElseThrow(
                            () -> new BusinessException(
                                    ErrorCode.NOT_FOUND
                            )
                    );
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

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasks(
            Long loginUserId,
            Long projectId
    ) {

        validateProjectMember(projectId, loginUserId);

        return taskRepository
                .findAllByProjectIdOrderByCreatedAtDesc(projectId)
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(
            Long loginUserId,
            Long projectId,
            Long taskId
    ) {

        validateProjectMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updateStatus(
            Long loginUserId,
            Long projectId,
            Long taskId,
            TaskStatusUpdateRequest request
    ) {

        validateProjectMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        task.changeStatus(request.status());

        return TaskResponse.from(task);
    }

    @Transactional
    public TaskResponse updateAssignee(
            Long loginUserId,
            Long projectId,
            Long taskId,
            TaskAssigneeUpdateRequest request
    ) {

        validateProjectMember(projectId, loginUserId);

        Task task = getTaskInProject(
                projectId,
                taskId
        );

        if (!projectMemberRepository
                .existsByProjectIdAndUserId(
                        projectId,
                        request.assigneeId()
                )) {
            throw new BusinessException(
                    ErrorCode.INVALID_TASK_ASSIGNEE
            );
        }

        User assignee = userRepository
                .findById(request.assigneeId())
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );

        task.assignTo(assignee);

        return TaskResponse.from(task);
    }

    private Project getProject(Long projectId) {
        return projectRepository
                .findById(projectId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );
    }

    private void validateProjectMember(
            Long projectId,
            Long userId
    ) {
        if (!projectMemberRepository
                .existsByProjectIdAndUserId(
                        projectId,
                        userId
                )) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
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