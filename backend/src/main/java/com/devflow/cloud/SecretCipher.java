package com.devflow.cloud;

import com.devflow.ops.config.CloudProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 사용자가 등록한 비밀값(Prometheus 토큰) 암호화. AES-256-GCM, 저장 형식 base64(iv 12바이트 + 암호문).
 * 키: DEVFLOW_ENCRYPTION_KEY(base64 32바이트). 없으면 JWT 비밀값에서 파생하고 경고를 남긴다.
 */
@Slf4j
@Component
public class SecretCipher {

    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SecretKeySpec key;

    public SecretCipher(CloudProperties properties, @Value("${jwt.secret}") String jwtSecret) {
        byte[] keyBytes;
        if (properties.encryptionKey() != null) {
            keyBytes = Base64.getDecoder().decode(properties.encryptionKey());
            if (keyBytes.length != 32) {
                throw new IllegalStateException("DEVFLOW_ENCRYPTION_KEY는 base64로 인코딩한 32바이트여야 합니다.");
            }
        } else {
            log.warn("DEVFLOW_ENCRYPTION_KEY가 없어 JWT 비밀값에서 암호화 키를 파생합니다. 운영 환경에서는 별도 키를 설정하세요.");
            keyBytes = sha256(("cloud-secret:" + jwtSecret).getBytes(StandardCharsets.UTF_8));
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
    }

    public String encrypt(String plain) {
        if (plain == null || plain.isEmpty()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            RANDOM.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv).put(encrypted).array());
        } catch (Exception e) {
            throw new IllegalStateException("비밀값을 암호화하지 못했습니다.", e);
        }
    }

    public String decrypt(String stored) {
        if (stored == null || stored.isEmpty()) {
            return null;
        }
        try {
            byte[] data = Base64.getDecoder().decode(stored);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, data, 0, IV_LENGTH));
            return new String(cipher.doFinal(data, IV_LENGTH, data.length - IV_LENGTH), StandardCharsets.UTF_8);
        } catch (Exception e) {
            // 키가 바뀌었거나 값이 손상된 경우: 토큰 없이 호출해 401을 받게 하고 원인을 남긴다
            log.warn("stored secret could not be decrypted (encryption key changed?)");
            return null;
        }
    }

    static byte[] sha256(byte[] input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
