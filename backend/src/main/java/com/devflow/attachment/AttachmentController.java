package com.devflow.attachment;

import com.devflow.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;

/** 업무 첨부파일 A1~A4 (Backend-API-구현-목록 15장) */
@RestController
@RequestMapping("/api/projects/{projectId}/tasks/{taskId}/attachments")
@RequiredArgsConstructor
public class AttachmentController {

    private final AttachmentService attachments;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttachmentDtos.AttachmentResponse>>> list(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(ApiResponse.success("첨부파일 목록 조회에 성공했습니다.",
                attachments.list(userId(authentication), projectId, taskId)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AttachmentDtos.AttachmentResponse>> upload(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long taskId,
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("첨부파일을 올렸습니다.",
                attachments.upload(userId(authentication), projectId, taskId, file)));
    }

    @GetMapping("/{attachmentId}")
    public ResponseEntity<InputStreamResource> downloadFile(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long taskId,
            @PathVariable Long attachmentId) {
        AttachmentDtos.AttachmentDownload file =
                attachments.downloadFile(userId(authentication), projectId, taskId, attachmentId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.size())
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8)
                        .build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(file.content()));
    }

    @GetMapping("/{attachmentId}/download")
    public ResponseEntity<ApiResponse<AttachmentDtos.DownloadResponse>> download(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long taskId,
            @PathVariable Long attachmentId) {
        return ResponseEntity.ok(ApiResponse.success("다운로드 주소를 만들었습니다.",
                attachments.download(userId(authentication), projectId, taskId, attachmentId)));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            Authentication authentication, @PathVariable Long projectId, @PathVariable Long taskId,
            @PathVariable Long attachmentId) {
        attachments.delete(userId(authentication), projectId, taskId, attachmentId);
        return ResponseEntity.ok(ApiResponse.success("첨부파일을 삭제했습니다.", null));
    }

    private static Long userId(Authentication authentication) {
        return (Long) authentication.getPrincipal();
    }
}
