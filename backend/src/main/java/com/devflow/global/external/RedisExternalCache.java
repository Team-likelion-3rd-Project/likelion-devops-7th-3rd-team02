package com.devflow.global.external;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Redis 캐시 (ON1 온프레미스 설계: Redis는 캐시 전용, 원본은 DB·외부 시스템).
 * Redis에 문제가 있으면 캐시 없이 바로 조회한다 (장애가 API로 번지지 않게).
 */
@Slf4j
public class RedisExternalCache implements ExternalCache {

    private static final String PREFIX = "devflow:ext:";

    private final StringRedisTemplate redis;

    public RedisExternalCache(StringRedisTemplate redis) {
        this.redis = redis;
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
        try {
            redis.opsForValue().set(PREFIX + key, value, ttl);
        } catch (RuntimeException e) {
            log.warn("redis cache put failed (ignored): {}", e.getMessage());
        }
    }

    @Override
    public Optional<String> peek(String key) {
        try {
            return Optional.ofNullable(redis.opsForValue().get(PREFIX + key));
        } catch (RuntimeException e) {
            log.warn("redis cache get failed (ignored): {}", e.getMessage());
            return Optional.empty();
        }
    }
}
