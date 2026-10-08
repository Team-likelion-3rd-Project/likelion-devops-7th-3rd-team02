export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export interface Task {
  id: number
  projectId: number
  title: string
  description: string | null
  status: TaskStatus
  assigneeId: number | null
  assigneeName: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskCreateRequest {
  title: string
  description?: string
  assigneeId?: number | null
}

// GET /projects/{projectId}/tasks 검색·필터 (설계서 6.4 계획). sort 허용 값은 Backend 확인 전 (10.2)
export interface TaskListParams {
  keyword?: string
  status?: TaskStatus
  assigneeId?: number
  page?: number
  size?: number
  sort?: string
}
