package com.devflow.task.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.task.dto.TaskAssigneeUpdateRequest;
import com.devflow.task.dto.TaskCreateRequest;
import com.devflow.task.dto.TaskResponse;
import com.devflow.task.dto.TaskStatusUpdateRequest;
import com.devflow.task.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(
            Authentication authentication,
            @PathVariable Long projectId
    ) {

        Long userId = (Long) authentication.getPrincipal();

        List<TaskResponse> response =
                taskService.getTasks(
                        userId,
                        projectId
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "업무 목록 조회에 성공했습니다.",
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