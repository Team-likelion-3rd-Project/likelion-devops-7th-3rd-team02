import api from './axios'
import type { ApiResponse } from '../types/api'
import type { MonitoringRange, MonitoringSummary } from '../types/monitoring'

// 설계서 6.8 (계획 + 확정). Backend 구현 전에는 목 모드(npm run dev:mock)로 확인한다.
export const getMonitoringSummary = (projectId: number | string, range: MonitoringRange) =>
  api.get<ApiResponse<MonitoringSummary>>(`/projects/${projectId}/monitoring/summary`, {
    params: { range },
  })
