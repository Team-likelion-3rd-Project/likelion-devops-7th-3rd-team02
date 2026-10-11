package com.devflow.project.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.member.type.ProjectRole;
import com.devflow.project.dto.ProjectCreateRequest;
import com.devflow.project.dto.ProjectListResponse;
import com.devflow.project.dto.ProjectResponse;
import com.devflow.project.entity.Project;
import com.devflow.project.repository.ProjectRepository;
import com.devflow.user.entity.User;
import com.devflow.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ProjectMemberRepository projectMemberRepository;

    @Transactional
    public ProjectResponse createProject(
            Long userId,
            ProjectCreateRequest request
    ) {

        User owner = userRepository.findById(userId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );

        Project project = new Project(
                request.name(),
                request.description(),
                owner
        );

        Project savedProject = projectRepository.save(project);

        // 프로젝트 생성자를 OWNER 역할의 ProjectMember로 자동 등록
        ProjectMember ownerMember = new ProjectMember(
                savedProject,
                owner,
                ProjectRole.OWNER
        );

        projectMemberRepository.save(ownerMember);

        return ProjectResponse.from(savedProject);
    }

    @Transactional(readOnly = true)
    public List<ProjectListResponse> getMyProjects(Long userId) {

        return projectMemberRepository
                .findAllByUserId(userId)
                .stream()
                .map(ProjectMember::getProject)
                .map(ProjectListResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(
            Long userId,
            Long projectId
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );

        // 프로젝트에 등록된 멤버인지 확인
        boolean isMember =
                projectMemberRepository.existsByProjectIdAndUserId(
                        projectId,
                        userId
                );

        if (!isMember) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return ProjectResponse.from(project);
    }
}