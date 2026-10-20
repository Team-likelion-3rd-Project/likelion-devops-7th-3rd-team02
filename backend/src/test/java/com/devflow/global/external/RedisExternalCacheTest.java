package com.devflow.global.external;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

class RedisExternalCacheTest {

    /** 테스트에서 시간을 앞으로 돌릴 수 있는 Clock */
    static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-10-20T06:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

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

    private ValueOperations<String, String> ops;
    private MutableClock clock;
    private RedisExternalCache cache;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        clock = new MutableClock();
        cache = new RedisExternalCache(redis, clock);
    }

    @Test
    void Redis가_정상이면_Redis에서_읽는다() {
        when(ops.get("devflow:ext:k")).thenReturn("v");

        assertThat(cache.get("k", Duration.ofSeconds(10), () -> "loaded")).isEqualTo("v");
        assertThat(cache.bypassing()).isFalse();
    }

    @Test
    void 한_번_실패하면_30초_동안_Redis를_호출하지_않고_메모리_캐시를_쓴다() {
        when(ops.get(anyString())).thenThrow(new RedisConnectionFailureException("down"));

        // 첫 호출: Redis 실패 → 원본 조회, 메모리에 저장
        assertThat(cache.get("k", Duration.ofSeconds(10), () -> "loaded")).isEqualTo("loaded");
        assertThat(cache.bypassing()).isTrue();

        // 같은 키 다시 조회: Redis 호출 없이 메모리 캐시
        assertThat(cache.get("k", Duration.ofSeconds(10), () -> "again")).isEqualTo("loaded");
        cache.peek("other");
        cache.put("other", "x", Duration.ofSeconds(10));

        verify(ops, times(1)).get(anyString());
        verify(ops, times(0)).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void 우회_시간이_지나면_Redis를_다시_시도하고_성공하면_복구된다() {
        when(ops.get(anyString()))
                .thenThrow(new RedisConnectionFailureException("down"))
                .thenReturn("from-redis");

        cache.peek("k");
        assertThat(cache.bypassing()).isTrue();

        clock.advance(RedisExternalCache.BYPASS.plusSeconds(1));
        assertThat(cache.peek("k")).contains("from-redis");
        assertThat(cache.bypassing()).isFalse();
        verify(ops, times(2)).get(anyString());
    }
}
