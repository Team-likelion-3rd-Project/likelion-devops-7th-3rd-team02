// 설계서 3.7, 6.9: 상태는 OPEN → ACKNOWLEDGED → RESOLVED (확정)
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

// 응답 필드는 Backend에 요청 중 (6.10): 제목, 상태, 심각도, 발생 시각, 출처, 담당자(userId)
// 필드명과 심각도 값은 확정 전 가정이다.
export interface Incident {
  id: number
  title: string
  status: IncidentStatus
  severity: string
  occurredAt: string
  source: string
  assigneeId: number | null
}
