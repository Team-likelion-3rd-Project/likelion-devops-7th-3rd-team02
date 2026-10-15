package com.devflow.ops.prometheus;

/** range vector의 한 점 (epochSeconds, 값) */
public record PromPoint(long epochSeconds, Double value) {
}
