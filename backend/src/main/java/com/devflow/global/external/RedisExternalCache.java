package com.devflow.global.external;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Redis 캐시 (ON1 온프레미스 설계: Redis는 캐시 전용, 원본은 DB·외부 시스템).
 * Redis에 문제가 있으면 캐시 없이 조회가 계속되어야 한다 (장애가 API로 번지지 않게).
 *
 * <p>Redis가 응답하지 않으면 명령마다 타임아웃(0.5초)을 기다리게 되어, 캐시를 여러 번 쓰는 API
 * (모니터링 요약은 약 20회)가 10초 이상 걸린다(10/20 온프렘 검증). 그래서 한 번 실패하면
 * {@link #BYPASS} 동안 Redis를 건너뛰고 Pod 메모리 캐시를 대신 쓴 뒤, 시간이 지나면 다시 시도한다.
 */
@Slf4j
public class RedisExternalCache implements ExternalCache {

    static final Duration BYPASS = Duration.ofSeconds(30);
    private static final String PREFIX = "devflow:ext:";

    private final StringRedisTemplate redis;
    private final MemoryExternalCache fallback;
    private final Clock clock;

    /** 이 시각 전까지는 Redis를 호출하지 않는다 (null이면 정상) */
    private volatile Instant bypassUntil;

    public RedisExternalCache(StringRedisTemplate redis, Clock clock) {
        this.redis = redis;
        this.clock = clock;
        this.fallback = new MemoryExternalCache(clock);
    }

    @Override
    public String get(String key, Duration ttl, Supplier<String> loader) {
        Optional<String> cached = peek(key);
        if (cached.isPresent()) {
            return cached.get();
        }
        String value = loader.get();
        put(key, value, ttl);
        return value;
    }

    @Override
    public void put(String key, String value, Duration ttl) {
        if (value == null || ttl.isZero() || ttl.isNegative()) {
            return;
        }
        if (bypassing()) {
            fallback.put(key, value, ttl);
            return;
        }
        try {
            redis.opsForValue().set(PREFIX + key, value, ttl);
            recovered();
        } catch (RuntimeException e) {
            failed("put", e);
            fallback.put(key, value, ttl);
        }
    }

    @Override
    public Optional<String> peek(String key) {
        if (bypassing()) {
            return fallback.peek(key);
        }
        try {
            Optional<String> value = Optional.ofNullable(redis.opsForValue().get(PREFIX + key));
            recovered();
            return value;
        } catch (RuntimeException e) {
            failed("get", e);
            return fallback.peek(key);
        }
    }

    boolean bypassing() {
        Instant until = bypassUntil;
        return until != null && clock.instant().isBefore(until);
    }

    private void failed(String operation, RuntimeException e) {
        bypassUntil = clock.instant().plus(BYPASS);
        log.warn("redis cache {} failed, using memory cache for {}s: {}", operation, BYPASS.toSeconds(), e.getMessage());
    }

    private void recovered() {
        if (bypassUntil != null) {
            bypassUntil = null;
            log.info("redis cache recovered");
        }
    }
}
