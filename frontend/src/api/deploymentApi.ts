import api from './axios'
import type { ApiResponse } from '../types/api'
import type { DeploymentListResponse, PageParams } from '../types/deployment'

// 설계서 6.7 (계획 + 확정). Backend 구현 전에는 화면에서 mocks/ 데이터를 쓴다.
export const getDeployments = (projectId: number | string, params?: PageParams) =>
  api.get<ApiResponse<DeploymentListResponse>>(
    `/projects/${projectId}/deployments`,
    { params },
  )
