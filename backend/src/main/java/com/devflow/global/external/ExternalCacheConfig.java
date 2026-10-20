package com.devflow.global.external;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Clock;

/** devflow.cache.type = memory(기본) | redis */
@Configuration
public class ExternalCacheConfig {

    @Bean
    public ExternalCache externalCache(
            @Value("${devflow.cache.type:memory}") String type,
            ObjectProvider<StringRedisTemplate> redisTemplate,
            Clock clock
    ) {
        if ("redis".equalsIgnoreCase(type)) {
            return new RedisExternalCache(redisTemplate.getObject(), clock);
        }
        return new MemoryExternalCache(clock);
    }
}
