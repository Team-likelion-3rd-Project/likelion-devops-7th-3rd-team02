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
