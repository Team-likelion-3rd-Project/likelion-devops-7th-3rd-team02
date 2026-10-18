import api from './axios'
import type { ApiResponse } from '../types/api'
import type { MonitoringRange, MonitoringSummary } from '../types/monitoring'

// 설계서 6.8 O1. env를 생략하면 프로젝트 기본 환경 (Backend 14.2)
export const getMonitoringSummary = (
  projectId: number | string,
  range: MonitoringRange,
  env?: string,
) =>
  api.get<ApiResponse<MonitoringSummary>>(`/projects/${projectId}/monitoring/summary`, {
    params: { range, env },
  })
