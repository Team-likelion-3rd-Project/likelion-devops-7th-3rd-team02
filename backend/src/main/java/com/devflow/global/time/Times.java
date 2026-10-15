package com.devflow.global.time;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * 시각 변환 공통 규칙 (Backend-API-구현-목록 2.3)
 * - DB에는 서버 시각(Asia/Seoul) LocalDateTime으로 저장한다 (기존 테이블과 같은 timestamp(6)).
 * - 3차 신규 API 응답은 오프셋을 포함한 ISO 8601(+09:00)로 보낸다.
 * - 외부 시스템(Alertmanager, CI)이 보낸 UTC 시각은 Asia/Seoul로 바꿔 저장한다.
 */
public final class Times {

    public static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private Times() {
    }

    public static OffsetDateTime toOffset(LocalDateTime seoulTime) {
        return seoulTime == null ? null : seoulTime.atZone(SEOUL).toOffsetDateTime();
    }

    public static LocalDateTime toSeoul(OffsetDateTime time) {
        return time == null ? null : time.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    public static LocalDateTime now(Clock clock) {
        return LocalDateTime.now(clock.withZone(SEOUL));
    }

    public static OffsetDateTime nowOffset(Clock clock) {
        return OffsetDateTime.now(clock.withZone(SEOUL));
    }
}
