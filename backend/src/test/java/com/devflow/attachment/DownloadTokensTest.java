package com.devflow.attachment;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class DownloadTokensTest {

    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-27T03:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final MutableClock clock = new MutableClock();
    private final DownloadTokens tokens = new DownloadTokens("smoke-jwt-secret-0123456789-0123456789", clock);

    @Test
    void 발급한_토큰은_만료_전까지_첨부파일_ID를_돌려준다() {
        String token = tokens.issue(42L, Duration.ofMinutes(5));

        assertThat(tokens.verify(token)).contains(42L);
        clock.now = clock.now.plus(Duration.ofMinutes(4));
        assertThat(tokens.verify(token)).contains(42L);
        clock.now = clock.now.plus(Duration.ofMinutes(2));
        assertThat(tokens.verify(token)).isEmpty();
    }

    @Test
    void 위조하거나_다른_키로_만든_토큰은_거절한다() {
        String token = tokens.issue(42L, Duration.ofMinutes(5));
        DownloadTokens other = new DownloadTokens("another-secret-0123456789-0123456789", clock);

        assertThat(tokens.verify(token + "x")).isEmpty();
        assertThat(tokens.verify("abc")).isEmpty();
        assertThat(tokens.verify(null)).isEmpty();
        assertThat(other.verify(token)).isEmpty();
        // 페이로드만 바꾼 토큰 (다른 첨부파일 ID)
        String forged = tokens.issue(43L, Duration.ofMinutes(5)).split("\\.")[0] + "." + token.split("\\.")[1];
        assertThat(tokens.verify(forged)).isEmpty();
    }
}
