package com.devflow.project.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import com.devflow.member.entity.ProjectMember;
import com.devflow.member.repository.ProjectMemberRepository;
import com.devflow.project.repository.ProjectRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ProjectAccessCheckerTest {

    private final ProjectRepository projectRepository = mock(ProjectRepository.class);
    private final ProjectMemberRepository projectMemberRepository = mock(ProjectMemberRepository.class);
    private final ProjectAccessChecker checker = new ProjectAccessChecker(projectRepository, projectMemberRepository);

    @Test
    void 없는_프로젝트는_팀원_여부와_상관없이_404다() {
        given(projectRepository.existsById(99L)).willReturn(false);

        assertThatThrownBy(() -> checker.checkMember(99L, 1L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.PROJECT_NOT_FOUND);
    }

    @Test
    void 프로젝트는_있지만_팀원이_아니면_403이다() {
        given(projectRepository.existsById(1L)).willReturn(true);
        given(projectMemberRepository.findByProjectIdAndUserId(1L, 2L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> checker.checkMember(1L, 2L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void 팀원이면_팀원_정보를_돌려준다() {
        ProjectMember membership = mock(ProjectMember.class);
        given(projectRepository.existsById(1L)).willReturn(true);
        given(projectMemberRepository.findByProjectIdAndUserId(1L, 2L)).willReturn(Optional.of(membership));

        assertThat(checker.getMembership(1L, 2L)).isSameAs(membership);
    }
}
