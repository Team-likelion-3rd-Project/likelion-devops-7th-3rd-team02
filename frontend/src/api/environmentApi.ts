import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  DatabaseStatus,
  EnvironmentSummary,
  K8sHpaListResponse,
  K8sNodeListResponse,
  LoadBalancerStatus,
} from '../types/environment'

// E1 환경 목록·요약 (항상 200, 연결한 환경이 없으면 [])
export const getEnvironmentSummaries = (projectId: number | string) =>
  api.get<ApiResponse<EnvironmentSummary[]>>(`/projects/${projectId}/environments`)

// E2~E5: 환경이 없거나 필요한 연결이 없으면 404 CLOUD_NOT_CONNECTED, 조회 실패는 502·504
export const getK8sNodes = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<K8sNodeListResponse>>(`/projects/${projectId}/k8s/nodes`, { params: { env } })

export const getK8sHpas = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<K8sHpaListResponse>>(`/projects/${projectId}/k8s/hpa`, { params: { env } })

export const getDatabaseStatus = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<DatabaseStatus>>(`/projects/${projectId}/cloud/database`, { params: { env } })

export const getLoadBalancerStatus = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<LoadBalancerStatus>>(`/projects/${projectId}/cloud/load-balancer`, {
    params: { env },
  })
