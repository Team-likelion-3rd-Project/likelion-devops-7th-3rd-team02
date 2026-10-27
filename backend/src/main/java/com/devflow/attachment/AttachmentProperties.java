package com.devflow.attachment;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * devflow.attachment
 * storage: local(기본, compose·온프렘) | s3(AWS, IRSA 권한)
 * max-per-task: 업무 하나당 첨부 개수 상한
 * download-url-ttl: 다운로드 주소 유효 시간
 */
@ConfigurationProperties(prefix = "devflow.attachment")
public record AttachmentProperties(
        String storage,
        Integer maxPerTask,
        Duration downloadUrlTtl,
        Local local,
        S3 s3
) {

    public AttachmentProperties {
        storage = storage == null || storage.isBlank() ? "local" : storage.trim().toLowerCase();
        maxPerTask = maxPerTask == null || maxPerTask <= 0 ? 20 : maxPerTask;
        downloadUrlTtl = downloadUrlTtl == null ? Duration.ofMinutes(5) : downloadUrlTtl;
        local = local == null ? new Local(null) : local;
        s3 = s3 == null ? new S3(null, null) : s3;
    }

    public record Local(String dir) {
        public Local {
            dir = dir == null || dir.isBlank() ? System.getProperty("java.io.tmpdir") + "/devflow-attachments" : dir.trim();
        }
    }

    public record S3(String bucket, String region) {
    }
}
