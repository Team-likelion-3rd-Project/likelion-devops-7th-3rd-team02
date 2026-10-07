import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Task, TaskCreateRequest, TaskStatus } from '../types/task'

export const getTasks = (projectId: number | string) =>
  api.get<ApiResponse<Task[]>>(`/projects/${projectId}/tasks`)

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
