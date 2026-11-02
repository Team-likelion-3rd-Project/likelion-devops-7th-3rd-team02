import api from './axios'
import type { ApiResponse } from '../types/api'
import type { PageParams, PipelineListResponse } from '../types/pipeline'

// 설계서 6.7 C1 (GitHub Actions 실행 기록)
export const getPipelines = (projectId: number | string, params?: PageParams) =>
  api.get<ApiResponse<PipelineListResponse>>(
    `/projects/${projectId}/cicd/pipelines`,
    { params },
  )
