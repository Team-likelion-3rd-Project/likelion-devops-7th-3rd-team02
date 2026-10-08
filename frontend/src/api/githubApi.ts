import api from './axios'
import type { ApiResponse } from '../types/api'
import type { GithubIssue } from '../types/github'
import type { Task } from '../types/task'

// 설계서 6.5 (계획). Frontend는 GitHub에 직접 접근하지 않고 Backend만 호출한다.
export const getGithubIssues = (projectId: number | string) =>
  api.get<ApiResponse<GithubIssue[]>>(`/projects/${projectId}/github/issues`)

// 이슈를 업무로 변환. 이미 가져온 이슈는 Backend가 중복 오류를 응답한다 (설계서 3.5).
export const importGithubIssue = (
  projectId: number | string,
  issueId: number | string,
) =>
  api.post<ApiResponse<Task>>(
    `/projects/${projectId}/github/issues/${issueId}/tasks`,
  )
