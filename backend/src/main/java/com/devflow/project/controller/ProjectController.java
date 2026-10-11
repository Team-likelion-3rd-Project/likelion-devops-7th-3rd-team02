package com.devflow.project.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.project.dto.ProjectCreateRequest;
import com.devflow.project.dto.ProjectListResponse;
import com.devflow.project.dto.ProjectResponse;
import com.devflow.project.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectResponse>> createProject(
            Authentication authentication,
            @Valid @RequestBody ProjectCreateRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        ProjectResponse response =
                projectService.createProject(userId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "프로젝트가 생성되었습니다.",
                                response
                        )
                );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectListResponse>>> getMyProjects(
            Authentication authentication
    ) {

        Long userId = (Long) authentication.getPrincipal();

        List<ProjectListResponse> response =
                projectService.getMyProjects(userId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "프로젝트 목록 조회에 성공했습니다.",
                        response
                )
        );
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<ApiResponse<ProjectResponse>> getProject(
            Authentication authentication,
            @PathVariable Long projectId
    ) {

        Long userId = (Long) authentication.getPrincipal();

        ProjectResponse response =
                projectService.getProject(userId, projectId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "프로젝트 조회에 성공했습니다.",
                        response
                )
        );
    }
}