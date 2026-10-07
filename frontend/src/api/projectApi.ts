import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  Project,
  ProjectCreateRequest,
  ProjectListItem,
} from '../types/project'

export const getProjects = () =>
  api.get<ApiResponse<ProjectListItem[]>>('/projects')

export const getProject = (projectId: number | string) =>
  api.get<ApiResponse<Project>>(`/projects/${projectId}`)

export const createProject = (data: ProjectCreateRequest) =>
  api.post<ApiResponse<Project>>('/projects', data)
