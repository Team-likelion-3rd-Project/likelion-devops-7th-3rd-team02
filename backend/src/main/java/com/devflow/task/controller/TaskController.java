package com.devflow.task.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.task.dto.TaskAssigneeUpdateRequest;
import com.devflow.task.dto.TaskCreateRequest;
import com.devflow.task.dto.TaskListResponse;
import com.devflow.task.dto.TaskResponse;
import com.devflow.task.dto.TaskSearchCondition;
import com.devflow.task.dto.TaskStatusUpdateRequest;
import com.devflow.task.dto.TaskUpdateRequest;
import com.devflow.task.service.TaskService;
import com.devflow.task.type.TaskStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            Authentication authentication,
            @PathVariable Long projectId,
            @Valid @RequestBody TaskCreateRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskResponse response =
                taskService.createTask(
                        userId,
                        projectId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "업무가 생성되었습니다.",
                                response
                        )
                );
    }

    /**
     * 업무 목록 (Backend-API-구현-목록 T1)
     * keyword: 제목 부분 일치, status·assigneeId: 필터, sort: updatedAt,desc(기본) / createdAt,desc / title,asc,
     * page: 0부터, size: 기본 12, 최대 100
     */
    @GetMapping
    public ResponseEntity<ApiResponse<TaskListResponse>> getTasks(
            Authentication authentication,
            @PathVariable Long projectId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskSearchCondition condition = TaskSearchCondition.of(
                keyword, status, assigneeId, sort, page, size
        );

        TaskListResponse response =
                taskService.getTasks(
                        userId,
                        projectId,
                        condition
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무 목록 조회에 성공했습니다.",
                        response
                )
        );
    }

    /** 업무 제목·설명 수정 (Backend-API-구현-목록 T4) */
    @PatchMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTask(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody TaskUpdateRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskResponse response =
                taskService.updateTask(
                        userId,
                        projectId,
                        taskId,
                        request
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무가 수정되었습니다.",
                        response
                )
        );
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<ApiResponse<TaskResponse>> getTask(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long taskId
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskResponse response =
                taskService.getTask(
                        userId,
                        projectId,
                        taskId
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무 조회에 성공했습니다.",
                        response
                )
        );
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<ApiResponse<TaskResponse>> updateStatus(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody TaskStatusUpdateRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskResponse response =
                taskService.updateStatus(
                        userId,
                        projectId,
                        taskId,
                        request
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무 상태가 변경되었습니다.",
                        response
                )
        );
    }

    /** T7 업무 삭제: OWNER 또는 담당자 */
    @DeleteMapping("/{taskId}")
    public ResponseEntity<ApiResponse<Void>> deleteTask(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long taskId
    ) {
        taskService.deleteTask((Long) authentication.getPrincipal(), projectId, taskId);
        return ResponseEntity.ok(ApiResponse.success("업무가 삭제되었습니다.", null));
    }

    @PatchMapping("/{taskId}/assignee")
    public ResponseEntity<ApiResponse<TaskResponse>> updateAssignee(
            Authentication authentication,
            @PathVariable Long projectId,
            @PathVariable Long taskId,
            @Valid @RequestBody TaskAssigneeUpdateRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        TaskResponse response =
                taskService.updateAssignee(
                        userId,
                        projectId,
                        taskId,
                        request
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무 담당자가 변경되었습니다.",
                        response
                )
        );
    }
}