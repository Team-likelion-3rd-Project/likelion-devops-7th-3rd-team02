// 설계서 3.7, 6.9: 상태는 OPEN → ACKNOWLEDGED → RESOLVED (확정)
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

// 설계서 6.9 장애 응답 (Backend 확정). 심각도는 Alertmanager severity 라벨에서 온다 (시안: 경고, 긴급)
export type IncidentSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export interface Incident {
  id: number
  // 소속 프로젝트 (Backend 확정 2026-10-15, I1·I2·I3·I6·I7 응답 모두 포함)
  projectId: number
  projectName: string
  title: string
  status: IncidentStatus
  severity: IncidentSeverity
  occurredAt: string
  source: string
  assigneeId: number | null
  // 아래 세 필드는 Backend 확정 (선택 필드)
  // summary: 화면용 한 줄 요약 (예: "p95 1.8초 (기준 1.0초)")
  summary?: string | null
  metric?: IncidentMetric | null
  // false면 알림이 풀린 상태 ("현재 안정화됨")
  firing?: boolean
  // 확인·해결 시각 (Wiki 장애 객체). 아직이면 null
  acknowledgedAt?: string | null
  resolvedAt?: string | null
}

export interface IncidentMetric {
  name?: string
  currentValue: number
  threshold: number
  unit: string
}

// I7 GET /users/me/incidents: 내가 팀원인 모든 프로젝트의 장애 (Backend 확정 2026-10-15)
// - status 생략 시 OPEN, ACKNOWLEDGED / 발생 최신순, 최대 100건
// - openCount: status 조건과 무관한 전체 OPEN(확인 필요) 건수
export interface MyIncidentListResponse {
  openCount: number
  incidents: Incident[]
}
