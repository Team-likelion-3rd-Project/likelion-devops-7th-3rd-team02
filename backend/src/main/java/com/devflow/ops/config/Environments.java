package com.devflow.ops.config;

import com.devflow.global.exception.BusinessException;
import com.devflow.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/** env 파라미터 → 환경 설정 (12.1: 생략 시 현재 환경, 없는 값은 404 ENVIRONMENT_NOT_FOUND) */
@Component
@RequiredArgsConstructor
public class Environments {

    private final OpsProperties properties;

    public List<OpsProperties.Environment> all() {
        return properties.environments();
    }

    public OpsProperties.Environment resolve(String env) {
        String name = env == null || env.isBlank() ? properties.currentEnvironment() : env.trim();
        return properties.environments().stream()
                .filter(e -> e.name().equals(name))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.ENVIRONMENT_NOT_FOUND));
    }

    public String currentName() {
        return properties.currentEnvironment();
    }
}
