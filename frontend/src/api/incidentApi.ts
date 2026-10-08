import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Incident } from '../types/incident'

// 설계서 6.9 (확정). Backend 구현 전에는 화면에서 mocks/ 데이터를 쓴다.
export const getIncidents = (projectId: number | string) =>
  api.get<ApiResponse<Incident[]>>(`/projects/${projectId}/incidents`)
