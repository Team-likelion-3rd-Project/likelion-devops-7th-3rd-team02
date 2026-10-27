package com.devflow.attachment;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * 로컬 저장소 다운로드 주소용 서명 토큰: base64url("{attachmentId}:{만료 epoch초}") + "." + base64url(HMAC-SHA256)
 * 브라우저가 Authorization 헤더 없이 열 수 있도록 짧은 유효 시간의 서명 주소를 쓴다 (S3 presigned URL과 같은 방식).
 */
public class DownloadTokens {

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] key;
    private final Clock clock;

    public DownloadTokens(String secret, Clock clock) {
        this.key = sha256(("attachment-download:" + secret).getBytes(StandardCharsets.UTF_8));
        this.clock = clock;
    }

    public String issue(long attachmentId, Duration ttl) {
        long expires = clock.instant().plus(ttl).getEpochSecond();
        String payload = ENCODER.encodeToString((attachmentId + ":" + expires).getBytes(StandardCharsets.UTF_8));
        return payload + "." + ENCODER.encodeToString(hmac(payload));
    }

    public Instant expiresAt(Duration ttl) {
        return Instant.ofEpochSecond(clock.instant().plus(ttl).getEpochSecond());
    }

    /** 서명이 맞고 만료 전이면 첨부파일 ID */
    public Optional<Long> verify(String token) {
        if (token == null) {
            return Optional.empty();
        }
        int dot = token.indexOf('.');
        if (dot <= 0 || dot == token.length() - 1) {
            return Optional.empty();
        }
        String payload = token.substring(0, dot);
        try {
            byte[] signature = DECODER.decode(token.substring(dot + 1));
            if (!MessageDigest.isEqual(hmac(payload), signature)) {
                return Optional.empty();
            }
            String[] parts = new String(DECODER.decode(payload), StandardCharsets.UTF_8).split(":");
            if (parts.length != 2 || Long.parseLong(parts[1]) < clock.instant().getEpochSecond()) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(parts[0]));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private byte[] hmac(String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
