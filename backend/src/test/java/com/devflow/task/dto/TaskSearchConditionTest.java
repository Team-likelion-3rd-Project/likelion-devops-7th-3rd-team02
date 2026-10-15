package com.devflow.task.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import com.devflow.task.type.TaskSort;
import com.devflow.task.type.TaskStatus;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

class TaskSearchConditionTest {

    @Test
    void 값이_없으면_0페이지_12건_최근_수정순이다() {
        TaskSearchCondition condition = TaskSearchCondition.of(null, null, null, null, null, null);

        Pageable pageable = condition.toPageable();
        assertThat(pageable.getPageNumber()).isZero();
        assertThat(pageable.getPageSize()).isEqualTo(12);
        assertThat(pageable.getSort().getOrderFor("updatedAt").getDirection()).isEqualTo(Sort.Direction.DESC);
        assertThat(condition.sort()).isEqualTo(TaskSort.UPDATED_AT_DESC);
    }

    @Test
    void 프론트_정렬_값_세_가지를_모두_받는다() {
        assertThat(TaskSort.from("updatedAt,desc")).isEqualTo(TaskSort.UPDATED_AT_DESC);
        assertThat(TaskSort.from("createdAt,desc")).isEqualTo(TaskSort.CREATED_AT_DESC);
        assertThat(TaskSort.from("title,asc")).isEqualTo(TaskSort.TITLE_ASC);
        assertThat(TaskSort.from("title, asc")).isEqualTo(TaskSort.TITLE_ASC);
    }

    @Test
    void 허용되지_않는_정렬은_400이다() {
        assertThatThrownBy(() -> TaskSort.from("password,asc"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("sort");
    }

    @Test
    void 잘못된_page와_size는_400이다() {
        assertThatThrownBy(() -> TaskSearchCondition.of(null, null, null, null, -1, 12))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> TaskSearchCondition.of(null, null, null, null, 0, 0))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> TaskSearchCondition.of(null, null, null, null, 0, 101))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void 검색어는_앞뒤_공백을_지우고_빈_값은_조건에서_뺀다() {
        assertThat(TaskSearchCondition.of("  로그인 ", null, null, null, null, null).keyword()).isEqualTo("로그인");
        assertThat(TaskSearchCondition.of("   ", null, null, null, null, null).keyword()).isNull();
    }

    @Test
    void 상태별_건수용_조건은_status만_뺀다() {
        TaskSearchCondition condition = TaskSearchCondition.of("api", TaskStatus.DONE, 3L, "title,asc", 1, 12);

        TaskSearchCondition withoutStatus = condition.withoutStatus();

        assertThat(withoutStatus.status()).isNull();
        assertThat(withoutStatus.keyword()).isEqualTo("api");
        assertThat(withoutStatus.assigneeId()).isEqualTo(3L);
    }

    @Test
    void 빈_설명은_null로_저장한다() {
        assertThat(new TaskUpdateRequest("제목", "  ").normalizedDescription()).isNull();
        assertThat(new TaskUpdateRequest("제목", "내용").normalizedDescription()).isEqualTo("내용");
    }
}
