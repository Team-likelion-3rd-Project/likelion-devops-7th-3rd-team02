package com.devflow.integration.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class GithubMappingTest {

    @Test
    void 저장소_주소에서_owner_repo를_꺼낸다() {
        assertThat(GithubRepositoryPath.parse("https://github.com/team02/devflow")).isEqualTo("team02/devflow");
        assertThat(GithubRepositoryPath.parse("https://github.com/team02/devflow.git")).isEqualTo("team02/devflow");
        assertThat(GithubRepositoryPath.parse(" https://github.com/Team-likelion/devflow.api/ ")).isEqualTo("Team-likelion/devflow.api");
    }

    @Test
    void GitHub_주소가_아니면_400() {
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://gitlab.com/team02/devflow")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://github.com/team02")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse("https://github.com/team02/devflow/issues")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> GithubRepositoryPath.parse(null)).isInstanceOf(BusinessException.class);
    }

    @Test
    void Actions_상태를_DevFlow_상태로_바꾼다() {
        assertThat(GithubActionsMapper.status("queued", null)).isEqualTo("PENDING");
        assertThat(GithubActionsMapper.status("in_progress", null)).isEqualTo("RUNNING");
        assertThat(GithubActionsMapper.status("completed", "success")).isEqualTo("SUCCESS");
        assertThat(GithubActionsMapper.status("completed", "failure")).isEqualTo("FAILED");
        assertThat(GithubActionsMapper.status("completed", "cancelled")).isEqualTo("FAILED");
        assertThat(GithubActionsMapper.status("completed", "skipped")).isEqualTo("PENDING");
    }

    @Test
    void 커밋_메시지는_첫_줄만() {
        assertThat(GithubActionsMapper.firstLine("feat: 검색\n\n본문")).isEqualTo("feat: 검색");
        assertThat(GithubActionsMapper.firstLine(null)).isNull();
    }
}
