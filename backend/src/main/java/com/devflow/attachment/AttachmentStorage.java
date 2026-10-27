package com.devflow.attachment;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;

/** 첨부파일 본문 저장소 */
public interface AttachmentStorage {

    void put(String key, InputStream content, long size, String contentType);

    void delete(String key);

    /** 인증 헤더 없이 브라우저가 열 수 있는 다운로드 주소 (유효 시간 제한) */
    URI downloadUrl(TaskAttachment attachment, Duration ttl);
}
