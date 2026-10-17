import api from './axios'
import type { ApiResponse } from '../types/api'
import type { GithubConnectRequest, GithubRepository } from '../types/integration'

// 설계서 6.5 G2. 연결 전에는 data: null
export const getGithubRepository = (projectId: number | string) =>
  api.get<ApiResponse<GithubRepository | null>>(`/projects/${projectId}/github/repository`)

// G1 (OWNER). 저장소에 접근할 수 없으면 Backend가 REPOSITORY_NOT_ACCESSIBLE로 응답한다.
export const connectGithub = (projectId: number | string, data: GithubConnectRequest) =>
  api.post<ApiResponse<GithubRepository>>(`/projects/${projectId}/integrations/github`, data)
