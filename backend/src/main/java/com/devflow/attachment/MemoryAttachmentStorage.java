package com.devflow.attachment;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MemoryAttachmentStorage implements AttachmentStorage {

    private final Map<String, byte[]> objects = new ConcurrentHashMap<>();
    private final DownloadTokens tokens;

    public MemoryAttachmentStorage(DownloadTokens tokens) {
        this.tokens = tokens;
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        try {
            objects.put(key, content.readAllBytes());
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.ATTACHMENT_STORAGE_ERROR);
        }
    }

    @Override
    public void delete(String key) {
        objects.remove(key);
    }

    @Override
    public URI downloadUrl(TaskAttachment attachment, Duration ttl) {
        return URI.create(LocalAttachmentStorage.DOWNLOAD_PATH + tokens.issue(attachment.getId(), ttl));
    }

    @Override
    public InputStream open(String key) {
        byte[] content = objects.get(key);
        if (content == null) {
            throw new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND);
        }
        return new ByteArrayInputStream(content);
    }
}
