import api from './axios'
import type { ApiResponse } from '../types/api'
import type { PageParams, PipelineListResponse } from '../types/pipeline'

// 설계서 6.7 (계획 + 확정). Backend 구현 전에는 화면에서 mocks/ 데이터를 쓴다.
export const getPipelines = (projectId: number | string, params?: PageParams) =>
  api.get<ApiResponse<PipelineListResponse>>(
    `/projects/${projectId}/cicd/pipelines`,
    { params },
  )
