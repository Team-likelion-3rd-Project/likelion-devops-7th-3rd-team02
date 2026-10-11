package com.devflow.member.service;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.dto.ProjectMemberAddRequest;
import com.devflow.member.dto.ProjectMemberResponse;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.member.type.ProjectRole;
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
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectMemberResponse addMember(
            Long loginUserId,
            Long projectId,
            ProjectMemberAddRequest request
    ) {

        Project project = projectRepository.findById(projectId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );

        if (!project.getOwner().getId().equals(loginUserId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND)
                );

        if (projectMemberRepository
                .existsByProjectIdAndUserId(
                        projectId,
                        user.getId()
                )) {
            throw new BusinessException(
                    ErrorCode.DUPLICATE_PROJECT_MEMBER
            );
        }

        ProjectMember projectMember = new ProjectMember(
                project,
                user,
                ProjectRole.MEMBER
        );

        ProjectMember savedMember =
                projectMemberRepository.save(projectMember);

        return ProjectMemberResponse.from(savedMember);
    }

    @Transactional(readOnly = true)
    public List<ProjectMemberResponse> getMembers(
            Long loginUserId,
            Long projectId
    ) {

        if (!projectMemberRepository
                .existsByProjectIdAndUserId(
                        projectId,
                        loginUserId
                )) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        return projectMemberRepository
                .findAllByProjectId(projectId)
                .stream()
                .map(ProjectMemberResponse::from)
                .toList();
    }
}