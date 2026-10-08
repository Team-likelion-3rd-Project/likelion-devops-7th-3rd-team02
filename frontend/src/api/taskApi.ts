import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  Task,
  TaskCreateRequest,
  TaskListParams,
  TaskStatus,
} from '../types/task'

// 목록 응답의 페이지 정보 포함 여부는 Backend 확인 전이라 Task[]로 둔다 (설계서 10.2)
export const getTasks = (projectId: number | string, params?: TaskListParams) =>
  api.get<ApiResponse<Task[]>>(`/projects/${projectId}/tasks`, { params })

export const getTask = (projectId: number | string, taskId: number | string) =>
  api.get<ApiResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`)

export const createTask = (projectId: number | string, data: TaskCreateRequest) =>
  api.post<ApiResponse<Task>>(`/projects/${projectId}/tasks`, data)

export const updateTaskStatus = (
  projectId: number | string,
  taskId: number | string,
  status: TaskStatus,
) =>
  api.patch<ApiResponse<Task>>(
    `/projects/${projectId}/tasks/${taskId}/status`,
    { status },
  )

export const updateTaskAssignee = (
  projectId: number | string,
  taskId: number | string,
  assigneeId: number,
) =>
  api.patch<ApiResponse<Task>>(
    `/projects/${projectId}/tasks/${taskId}/assignee`,
    { assigneeId },
  )
