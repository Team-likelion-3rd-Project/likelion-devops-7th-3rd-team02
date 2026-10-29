import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  Task,
  TaskCreateRequest,
  TaskListParams,
  TaskListResponse,
  TaskStatus,
  TaskUpdateRequest,
} from '../types/task'

// 업무 목록 (T1): { tasks, totalCount, statusCounts } (Backend 확정)
export const getTasks = (projectId: number | string, params?: TaskListParams) =>
  api.get<ApiResponse<TaskListResponse>>(`/projects/${projectId}/tasks`, { params })

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

// assigneeId가 null이면 담당자 해제 (Backend T6, 2026-10-18)
export const updateTaskAssignee = (
  projectId: number | string,
  taskId: number | string,
  assigneeId: number | null,
) =>
  api.patch<ApiResponse<Task>>(
    `/projects/${projectId}/tasks/${taskId}/assignee`,
    { assigneeId },
  )

// 제목·내용 수정 (설계서 4.6). 상태·담당자는 위의 전용 API를 쓴다.
export const updateTask = (
  projectId: number | string,
  taskId: number | string,
  data: TaskUpdateRequest,
) => api.patch<ApiResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`, data)

// 업무 삭제 (Backend T7). OWNER 또는 그 업무의 담당자만, 그 외 팀원은 403
export const deleteTask = (projectId: number | string, taskId: number | string) =>
  api.delete<ApiResponse<null>>(`/projects/${projectId}/tasks/${taskId}`)
