package com.devflow.global.external;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/** Redis가 없는 환경(local, CI)용. Pod마다 따로 가진다. 항목이 많아지면 만료된 것부터 정리한다. */
public class MemoryExternalCache implements ExternalCache {

    private static final int CLEANUP_THRESHOLD = 1_000;

    private record Entry(String value, Instant expiresAt) {
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();
    private final Clock clock;

    public MemoryExternalCache(Clock clock) {
        this.clock = clock;
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
        if (entries.size() > CLEANUP_THRESHOLD) {
            Instant now = clock.instant();
            entries.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
        }
        entries.put(key, new Entry(value, clock.instant().plus(ttl)));
    }

    @Override
    public Optional<String> peek(String key) {
        Entry entry = entries.get(key);
        if (entry == null || entry.expiresAt().isBefore(clock.instant())) {
            return Optional.empty();
        }
        return Optional.of(entry.value());
    }
}
