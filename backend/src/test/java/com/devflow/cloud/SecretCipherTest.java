package com.devflow.cloud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devflow.ops.config.CloudProperties;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class SecretCipherTest {

    private static final String JWT = "smoke-jwt-secret-smoke-jwt-secret-0123456789";

    @Test
    void 암호화한_값은_복호화하면_원문이고_매번_다르다() {
        SecretCipher cipher = new SecretCipher(new CloudProperties(null, null, null), JWT);
        String first = cipher.encrypt("prom-token");
        String second = cipher.encrypt("prom-token");

        assertThat(first).isNotEqualTo("prom-token").isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("prom-token");
        assertThat(cipher.decrypt(second)).isEqualTo("prom-token");
    }

    @Test
    void 빈_값은_저장하지_않는다() {
        SecretCipher cipher = new SecretCipher(new CloudProperties(null, null, null), JWT);
        assertThat(cipher.encrypt(null)).isNull();
        assertThat(cipher.encrypt("")).isNull();
        assertThat(cipher.decrypt(null)).isNull();
    }

    @Test
    void 키가_바뀌거나_손상된_값은_null() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        SecretCipher original = new SecretCipher(new CloudProperties(null, null, key), JWT);
        SecretCipher other = new SecretCipher(new CloudProperties(null, null, null), JWT);
        String stored = original.encrypt("prom-token");

        assertThat(other.decrypt(stored)).isNull();
        assertThat(original.decrypt("not-base64!")).isNull();
    }

    @Test
    void 별도_키는_32바이트여야_한다() {
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);
        assertThatThrownBy(() -> new SecretCipher(new CloudProperties(null, null, shortKey), JWT))
                .isInstanceOf(IllegalStateException.class);
    }
}
