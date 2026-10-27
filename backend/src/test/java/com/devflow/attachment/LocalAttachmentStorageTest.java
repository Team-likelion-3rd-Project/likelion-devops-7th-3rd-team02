package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.global.exception.BusinessException;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalAttachmentStorageTest {

    @TempDir
    Path dir;

    @Test
    void 저장_읽기_삭제() throws Exception {
        LocalAttachmentStorage storage = new LocalAttachmentStorage(dir,
                new DownloadTokens("secret-0123456789-0123456789-0123", Clock.systemUTC()));
        byte[] body = "hello".getBytes(StandardCharsets.UTF_8);

        storage.put("projects/1/tasks/2/abc", new ByteArrayInputStream(body), body.length, "text/plain");
        assertThat(Files.readAllBytes(storage.file("projects/1/tasks/2/abc"))).isEqualTo(body);

        storage.delete("projects/1/tasks/2/abc");
        assertThatThrownBy(() -> storage.file("projects/1/tasks/2/abc")).isInstanceOf(BusinessException.class);
    }

    @Test
    void 저장소_밖_경로는_열지_않는다() {
        LocalAttachmentStorage storage = new LocalAttachmentStorage(dir,
                new DownloadTokens("secret-0123456789-0123456789-0123", Clock.systemUTC()));
        assertThatThrownBy(() -> storage.file("../../etc/passwd")).isInstanceOf(BusinessException.class);
    }
}
