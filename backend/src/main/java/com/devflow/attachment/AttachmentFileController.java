package com.devflow.attachment;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * 로컬 저장소 다운로드 (A3이 내려준 서명 주소). 인증 헤더 없이 열리며, 서명·만료로 보호한다.
 * S3 저장소에서는 presigned URL을 쓰므로 404.
 */
@RestController
@RequiredArgsConstructor
public class AttachmentFileController {

    private final AttachmentService attachments;
    private final AttachmentStorage storage;

    @GetMapping(LocalAttachmentStorage.DOWNLOAD_PATH + "{token}")
    public ResponseEntity<Resource> file(@PathVariable String token) {
        if (!(storage instanceof LocalAttachmentStorage local)) {
            throw new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND);
        }
        TaskAttachment attachment = attachments.byDownloadToken(token);
        FileSystemResource body = new FileSystemResource(local.file(attachment.getStorageKey()));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .contentLength(attachment.getSizeBytes())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(attachment.getOriginalName(), StandardCharsets.UTF_8)
                        .build().toString())
                .body(body);
    }
}
