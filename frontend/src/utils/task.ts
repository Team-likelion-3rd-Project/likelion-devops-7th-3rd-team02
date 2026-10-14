import type { Task, TaskListResponse } from '../types/task'

export interface NormalizedTask extends Task {
  assignee: string
}

export const normalizeTask = (task: Task): NormalizedTask => ({
  ...task,
  assignee: task.assigneeName ?? '담당자 없음',
})

// 업무 목록 응답을 한 형태로 맞춘다. 이전 형식(Task[])에는 전체 건수와 상태별 건수가 없다.
export type TaskPage = Pick<TaskListResponse, 'tasks'> & Partial<Omit<TaskListResponse, 'tasks'>>

export const toTaskPage = (data: TaskListResponse | Task[] | null | undefined): TaskPage => {
  if (!data) return { tasks: [] }
  if (Array.isArray(data)) return { tasks: data }
  return data
}
