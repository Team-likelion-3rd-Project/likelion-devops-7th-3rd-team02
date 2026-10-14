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

// 응답은 { tasks, totalCount, statusCounts }로 확정됐지만 현재 Backend는 아직 Task[]를 반환한다.
// 바뀌기 전까지 둘 다 받고, 화면에서는 utils/task.ts의 toTaskPage로 맞춰 쓴다.
export const getTasks = (projectId: number | string, params?: TaskListParams) =>
  api.get<ApiResponse<TaskListResponse | Task[]>>(`/projects/${projectId}/tasks`, { params })

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

// 제목·내용 수정 (설계서 4.6). 상태·담당자는 위의 전용 API를 쓴다.
export const updateTask = (
  projectId: number | string,
  taskId: number | string,
  data: TaskUpdateRequest,
) => api.patch<ApiResponse<Task>>(`/projects/${projectId}/tasks/${taskId}`, data)
