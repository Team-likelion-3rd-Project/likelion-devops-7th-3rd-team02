package com.devflow.attachment;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * S3 저장소 (AWS). 자격 증명은 기본 체인(EKS IRSA). 필요한 권한: 버킷 /* 에 s3:PutObject, s3:GetObject, s3:DeleteObject.
 * 다운로드는 presigned GET URL → 파일이 Backend를 거치지 않고, 브라우저 이동이라 CORS도 필요 없다.
 */
@Slf4j
public class S3AttachmentStorage implements AttachmentStorage {

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;

    public S3AttachmentStorage(S3Client s3, S3Presigner presigner, String bucket) {
        this.s3 = s3;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        try {
            s3.putObject(PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(key)
                            .contentType(contentType)
                            .contentLength(size)
                            .build(),
                    RequestBody.fromInputStream(content, size));
        } catch (RuntimeException e) {
            log.error("s3 put failed: {}", key, e);
            throw new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String key) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (RuntimeException e) {
            log.warn("s3 delete failed (ignored): {} {}", key, e.getMessage());
        }
    }

    @Override
    public URI downloadUrl(TaskAttachment attachment, Duration ttl) {
        try {
            GetObjectRequest get = GetObjectRequest.builder()
                    .bucket(bucket)
                    .key(attachment.getStorageKey())
                    .responseContentType(attachment.getContentType())
                    .responseContentDisposition(ContentDisposition.attachment()
                            .filename(attachment.getOriginalName(), StandardCharsets.UTF_8)
                            .build().toString())
                    .build();
            return presigner.presignGetObject(GetObjectPresignRequest.builder()
                            .signatureDuration(ttl)
                            .getObjectRequest(get)
                            .build())
                    .url().toURI();
        } catch (Exception e) {
            log.error("s3 presign failed: {}", attachment.getStorageKey(), e);
            throw new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR);
        }
    }
}
