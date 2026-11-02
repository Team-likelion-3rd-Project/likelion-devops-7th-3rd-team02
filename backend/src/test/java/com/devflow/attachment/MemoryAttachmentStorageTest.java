package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;

class MemoryAttachmentStorageTest {

    private final DownloadTokens tokens = new DownloadTokens("test-secret", Clock.systemUTC());
    private final MemoryAttachmentStorage storage = new MemoryAttachmentStorage(tokens);

    private static ByteArrayInputStream content() {
        return new ByteArrayInputStream("본문".getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void Put과_열기가_같은_내용을_돌려준다() throws IOException {
        storage.put("projects/1/tasks/7/key", content(), 6, "text/plain");

        assertThat(new String(storage.open("projects/1/tasks/7/key").readAllBytes(), StandardCharsets.UTF_8))
                .isEqualTo("본문");
    }

    @Test
    void 없는_키를_열면_ATTACHMENT_NOT_FOUND다() {
        assertThatThrownBy(() -> storage.open("projects/1/tasks/7/missing"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.ATTACHMENT_NOT_FOUND);
    }

    @Test
    void 삭제하면_다시_열_수_없다() {
        storage.put("projects/1/tasks/7/key", content(), 6, "text/plain");
        storage.delete("projects/1/tasks/7/key");

        assertThatThrownBy(() -> storage.open("projects/1/tasks/7/key"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void 다운로드_주소는_로컬_서명_주소_경로를_쓴다() {
        TaskAttachment attachment = mock(TaskAttachment.class);
        given(attachment.getId()).willReturn(3L);

        assertThat(storage.downloadUrl(attachment, Duration.ofMinutes(5)).toString())
                .startsWith(LocalAttachmentStorage.DOWNLOAD_PATH);
    }
}
