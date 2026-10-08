import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  GithubConnectRequest,
  GithubRepository,
  GitlabConnectRequest,
  GitlabIntegration,
} from '../types/integration'

// 설계서 6.5, 6.6. 연결되지 않은 프로젝트의 조회 응답 형태(빈 data 또는 404)는 Backend 확인 전이다.
export const getGithubRepository = (projectId: number | string) =>
  api.get<ApiResponse<GithubRepository | null>>(`/projects/${projectId}/github/repository`)

export const connectGithub = (projectId: number | string, data: GithubConnectRequest) =>
  api.post<ApiResponse<GithubRepository>>(`/projects/${projectId}/integrations/github`, data)

export const getGitlabIntegration = (projectId: number | string) =>
  api.get<ApiResponse<GitlabIntegration | null>>(`/projects/${projectId}/integrations/gitlab`)

export const connectGitlab = (projectId: number | string, data: GitlabConnectRequest) =>
  api.post<ApiResponse<GitlabIntegration>>(`/projects/${projectId}/integrations/gitlab`, data)
