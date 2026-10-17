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

// PATCH /projects/{projectId}/tasks/{taskId} 제목·내용 수정 (설계서 4.6, 6.4 계획 P0)
export interface TaskUpdateRequest {
  title: string
  description?: string
}

export interface TaskCreateRequest {
  title: string
  description?: string
  assigneeId?: number | null
}

// GET /projects/{projectId}/tasks 검색·필터 (설계서 6.4). page는 0부터 (Spring Pageable)
export interface TaskListParams {
  keyword?: string
  status?: TaskStatus
  assigneeId?: number
  page?: number
  size?: number
  sort?: string
}

// GET /projects/{projectId}/tasks 응답 (Backend 확정)
// - totalCount: status를 포함한 모든 조건에 맞는 전체 건수 (페이지 표시)
// - statusCounts: status 조건만 빼고 나머지 조건을 적용한 상태별 건수 (칸 제목)
export interface TaskListResponse {
  tasks: Task[]
  totalCount: number
  statusCounts: Record<TaskStatus, number>
}
