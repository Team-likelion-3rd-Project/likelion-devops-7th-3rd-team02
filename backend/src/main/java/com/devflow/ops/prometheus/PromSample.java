package com.devflow.ops.prometheus;

import java.util.Map;

/** Prometheus instant vector 한 줄: 라벨 + 값 (NaN·Inf는 null) */
public record PromSample(Map<String, String> labels, Double value) {

    public String label(String key) {
        return labels.get(key);
    }

    /** 지표 이름. 계산식 결과처럼 이름이 없으면 빈 문자열 */
    public String name() {
        return labels.getOrDefault("__name__", "");
    }

    public double valueOr(double fallback) {
        return value == null ? fallback : value;
    }
}
