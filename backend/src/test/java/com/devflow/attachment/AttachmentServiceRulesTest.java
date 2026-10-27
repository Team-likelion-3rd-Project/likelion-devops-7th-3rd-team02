package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class AttachmentServiceRulesTest {

    @Test
    void 파일_이름에서_경로와_제어_문자를_뺀다() {
        assertThat(AttachmentService.fileName("C:\\Users\\me\\회의 메모.txt")).isEqualTo("회의 메모.txt");
        assertThat(AttachmentService.fileName("../../etc/passwd")).isEqualTo("passwd");
        assertThat(AttachmentService.fileName("a\u0000b\nc.txt")).isEqualTo("abc.txt");
        assertThat(AttachmentService.fileName("  ")).isEqualTo("file");
        assertThat(AttachmentService.fileName(null)).isEqualTo("file");
        assertThat(AttachmentService.fileName("..")).isEqualTo("file");
        assertThat(AttachmentService.fileName("x".repeat(300) + ".pdf")).hasSize(255).endsWith(".pdf");
    }

    @Test
    void 형식이_이상한_content_type은_octet_stream() {
        assertThat(AttachmentService.contentType("image/png")).isEqualTo("image/png");
        assertThat(AttachmentService.contentType("text/plain; charset=UTF-8")).isEqualTo("text/plain; charset=UTF-8");
        assertThat(AttachmentService.contentType(null)).isEqualTo("application/octet-stream");
        assertThat(AttachmentService.contentType("<script>")).isEqualTo("application/octet-stream");
    }
}
