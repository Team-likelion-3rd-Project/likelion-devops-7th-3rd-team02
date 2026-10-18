import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  CloudEnvironment,
  CloudEnvironmentRequest,
  CloudTestResponse,
  WebhookTokenIssued,
  WebhookTokenSummary,
  WebhookTokenType,
} from '../types/cloud'

// CL1 (팀원). 기본 환경이 먼저, 그다음 등록순
export const getCloudEnvironments = (projectId: number | string) =>
  api.get<ApiResponse<CloudEnvironment[]>>(`/projects/${projectId}/cloud/environments`)

// CL2~CL5 (OWNER)
export const createCloudEnvironment = (projectId: number | string, data: CloudEnvironmentRequest) =>
  api.post<ApiResponse<CloudEnvironment>>(`/projects/${projectId}/cloud/environments`, data)

export const updateCloudEnvironment = (
  projectId: number | string,
  environmentId: number,
  data: CloudEnvironmentRequest,
) =>
  api.put<ApiResponse<CloudEnvironment>>(
    `/projects/${projectId}/cloud/environments/${environmentId}`,
    data,
  )

export const deleteCloudEnvironment = (projectId: number | string, environmentId: number) =>
  api.delete<ApiResponse<null>>(`/projects/${projectId}/cloud/environments/${environmentId}`)

export const testCloudEnvironment = (projectId: number | string, environmentId: number) =>
  api.post<ApiResponse<CloudTestResponse>>(
    `/projects/${projectId}/cloud/environments/${environmentId}/test`,
  )

// WT1·WT2 (OWNER). 다시 발급하면 이전 토큰은 바로 무효가 된다.
export const getWebhookTokens = (projectId: number | string) =>
  api.get<ApiResponse<WebhookTokenSummary[]>>(`/projects/${projectId}/webhook-tokens`)

export const issueWebhookToken = (projectId: number | string, type: WebhookTokenType) =>
  api.post<ApiResponse<WebhookTokenIssued>>(`/projects/${projectId}/webhook-tokens/${type}`)
