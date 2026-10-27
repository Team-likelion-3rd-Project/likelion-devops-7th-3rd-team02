package com.devflow.attachment;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

/**
 * 로컬 디렉터리 저장소 (docker compose·CI·온프렘). 다운로드는 Backend가 서명 주소로 직접 내려준다.
 * 온프렘에서 Pod 재시작 후에도 남기려면 devflow.attachment.local.dir에 PVC를 마운트한다.
 */
@Slf4j
public class LocalAttachmentStorage implements AttachmentStorage {

    static final String DOWNLOAD_PATH = "/api/attachments/files/";

    private final Path root;
    private final DownloadTokens tokens;

    public LocalAttachmentStorage(Path root, DownloadTokens tokens) {
        this.root = root.toAbsolutePath().normalize();
        this.tokens = tokens;
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.copy(content, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("attachment write failed: {}", key, e);
            throw new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            log.warn("attachment delete failed (ignored): {} {}", key, e.getMessage());
        }
    }

    @Override
    public URI downloadUrl(TaskAttachment attachment, Duration ttl) {
        return URI.create(DOWNLOAD_PATH + tokens.issue(attachment.getId(), ttl));
    }

    /** 서명 주소로 들어온 다운로드 요청에서 파일 열기 */
    public Path file(String key) {
        Path file = resolve(key);
        if (!Files.isRegularFile(file)) {
            throw new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND);
        }
        return file;
    }

    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) {
            throw new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND);
        }
        return path;
    }
}
