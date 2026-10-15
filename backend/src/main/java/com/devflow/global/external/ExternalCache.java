package com.devflow.global.external;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * 외부 시스템(Prometheus, GitHub) 응답 캐시. 값은 응답 본문 문자열 그대로 저장한다.
 * 캐시가 고장 나도 조회는 계속되어야 하므로 구현체는 예외를 밖으로 던지지 않는다.
 */
public interface ExternalCache {

    String get(String key, Duration ttl, Supplier<String> loader);

    void put(String key, String value, Duration ttl);

    Optional<String> peek(String key);
}
