import api from './axios'
import type { ApiResponse } from '../types/api'
import type { DeploymentListResponse, PageParams } from '../types/deployment'

// 설계서 6.7 D1 (CI가 배포 기록 Webhook D3로 보낸 기록)
export const getDeployments = (projectId: number | string, params?: PageParams) =>
  api.get<ApiResponse<DeploymentListResponse>>(
    `/projects/${projectId}/deployments`,
    { params },
  )
