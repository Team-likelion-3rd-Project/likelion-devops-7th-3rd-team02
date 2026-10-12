import type { MonitoringRange } from '../types/monitoring'

// 설계서 3.8 기간 선택: 1시간, 6시간, 24시간
export const RANGE_LABEL: Record<MonitoringRange, string> = {
  '1h': '1시간',
  '6h': '6시간',
  '24h': '24시간',
}

export const RANGE_MINUTES: Record<MonitoringRange, number> = { '1h': 60, '6h': 360, '24h': 1440 }
