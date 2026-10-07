import api from './axios'
import type { ApiResponse } from '../types/api'
import type { MemberAddRequest, ProjectMember } from '../types/member'

export const getMembers = (projectId: number | string) =>
  api.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`)

export const addMember = (projectId: number | string, data: MemberAddRequest) =>
  api.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, data)
