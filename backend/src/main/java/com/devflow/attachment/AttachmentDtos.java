package com.devflow.attachment;

import com.devflow.global.time.Times;

import java.time.OffsetDateTime;

/** 첨부파일 응답 (Backend-API-구현-목록 15장) */
public final class AttachmentDtos {

    private AttachmentDtos() {
    }

    public record AttachmentResponse(
            Long id,
            Long taskId,
            String fileName,
            String contentType,
            long size,
            Long uploaderId,
            String uploaderName,
            OffsetDateTime createdAt
    ) {
        static AttachmentResponse from(TaskAttachment a) {
            return new AttachmentResponse(
                    a.getId(),
                    a.getTask().getId(),
                    a.getOriginalName(),
                    a.getContentType(),
                    a.getSizeBytes(),
                    a.getUploader().getId(),
                    a.getUploader().getName(),
                    Times.toOffset(a.getCreatedAt()));
        }
    }

    /** 다운로드 주소. 브라우저로 이 주소를 열면 파일이 내려온다 (인증 헤더 불필요, 유효 시간 안에서만) */
    public record DownloadResponse(String url, OffsetDateTime expiresAt) {
    }
}
