package com.devflow.member.controller;

import com.devflow.global.response.ApiResponse;
import com.devflow.member.dto.ProjectMemberAddRequest;
import com.devflow.member.dto.ProjectMemberResponse;
import com.devflow.member.service.ProjectMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {

    private final ProjectMemberService projectMemberService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProjectMemberResponse>> addMember(
            Authentication authentication,
            @PathVariable Long projectId,
            @Valid @RequestBody ProjectMemberAddRequest request
    ) {

        Long userId = (Long) authentication.getPrincipal();

        ProjectMemberResponse response =
                projectMemberService.addMember(
                        userId,
                        projectId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                "프로젝트 팀원이 등록되었습니다.",
                                response
                        )
                );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProjectMemberResponse>>> getMembers(
            Authentication authentication,
            @PathVariable Long projectId
    ) {

        Long userId = (Long) authentication.getPrincipal();

        List<ProjectMemberResponse> response =
                projectMemberService.getMembers(
                        userId,
                        projectId
                );

        return ResponseEntity.ok(
                ApiResponse.success(
                        "프로젝트 팀원 목록 조회에 성공했습니다.",
                        response
                )
        );
    }
}