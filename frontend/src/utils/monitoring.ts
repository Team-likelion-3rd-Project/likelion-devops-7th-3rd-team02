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
