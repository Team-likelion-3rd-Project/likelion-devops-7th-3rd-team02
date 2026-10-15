import type { Incident } from '../types/incident'
import type { MonitoringRange } from '../types/monitoring'

// 설계서 3.8 기간 선택: 1시간, 6시간, 24시간
export const RANGE_LABEL: Record<MonitoringRange, string> = {
  '1h': '1시간',
  '6h': '6시간',
  '24h': '24시간',
}

export const RANGE_MINUTES: Record<MonitoringRange, number> = { '1h': 60, '6h': 360, '24h': 1440 }

// 지표 값은 소수점 한 자리까지 보여준다 (오류율·CPU·메모리는 0~100 %, 응답 시간은 ms)
export const formatMetric = (value: number) => String(Math.round(value * 10) / 10)

// 장애 한 줄 요약. Backend의 summary를 쓰고, 없으면 metric으로 만든다.
export const incidentSummary = (incident: Incident): string | null => {
  if (incident.summary) return incident.summary
  if (!incident.metric) return null

  const { currentValue, threshold, unit } = incident.metric
  return `${formatMetric(currentValue)}${unit} (기준 ${formatMetric(threshold)}${unit})`
}

// 장애 표시 기준 (모니터링, 대시보드 배너, 전체 장애가 같이 쓴다)
// - 열린 장애: 해결되지 않은 장애 (OPEN, ACKNOWLEDGED)
// - 확인 필요: 아직 아무도 확인하지 않은 장애 (OPEN)
export const isOpenIncident = (incident: Incident) => incident.status !== 'RESOLVED'
export const needsCheck = (incident: Incident) => incident.status === 'OPEN'

// 장애를 확인하거나 담당자를 바꾼 뒤 알린다. 사이드바 전체 장애 배지가 다시 불러온다.
export const INCIDENTS_CHANGED_EVENT = 'devflow:incidents-changed'
export const notifyIncidentsChanged = () => window.dispatchEvent(new Event(INCIDENTS_CHANGED_EVENT))
