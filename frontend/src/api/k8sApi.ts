import api from './axios'
import type { ApiResponse } from '../types/api'
import type { K8sDeploymentListResponse, K8sPodListResponse } from '../types/monitoring'

// 설계서 6.8 K1·K2. Frontend는 Kubernetes에 직접 접근하지 않고 Backend만 호출한다.
// env를 생략하면 프로젝트 기본 환경 (Backend 14.2)
export const getK8sPods = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<K8sPodListResponse>>(`/projects/${projectId}/k8s/pods`, { params: { env } })

export const getK8sDeployments = (projectId: number | string, env?: string) =>
  api.get<ApiResponse<K8sDeploymentListResponse>>(`/projects/${projectId}/k8s/deployments`, {
    params: { env },
  })
