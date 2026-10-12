import type { Task } from '../types/task'

export interface NormalizedTask extends Task {
  assignee: string
}

export const normalizeTask = (task: Task): NormalizedTask => ({
  ...task,
  assignee: task.assigneeName ?? '담당자 없음',
})
