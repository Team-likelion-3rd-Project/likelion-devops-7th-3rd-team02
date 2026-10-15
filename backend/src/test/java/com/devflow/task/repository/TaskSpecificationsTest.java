package com.devflow.task.repository;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TaskSpecificationsTest {

    @Test
    void 검색어의_퍼센트와_밑줄은_글자_그대로_찾는다() {
        assertThat(TaskSpecifications.escapeLike("100%_done\\")).isEqualTo("100\\%\\_done\\\\");
    }
}
