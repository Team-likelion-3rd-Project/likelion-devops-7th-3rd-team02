package com.devflow.project.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.project.entity.Project;
import com.devflow.project.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 프로젝트 하위 API의 공통 접근 확인.
 * 프로젝트가 없으면 404 PROJECT_NOT_FOUND, 있지만 팀원이 아니면 403 FORBIDDEN (API 명세 10.1 #4).
 */
@Component
@RequiredArgsConstructor
public class ProjectAccessChecker {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public Project getProject(Long projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROJECT_NOT_FOUND));
    }

    /** 프로젝트 존재 → 팀원 여부 순서로 확인하고, 로그인 사용자의 팀원 정보(역할 포함)를 돌려준다. */
    public ProjectMember getMembership(Long projectId, Long userId) {
        if (!projectRepository.existsById(projectId)) {
            throw new BusinessException(ErrorCode.PROJECT_NOT_FOUND);
        }
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FORBIDDEN));
    }

    public void checkMember(Long projectId, Long userId) {
        getMembership(projectId, userId);
    }
}
