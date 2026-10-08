import type { BadgeTone } from '../components/common/StatusBadge'
import type { DeploymentStatus } from '../types/deployment'
import type { PullRequestStatus, TaskStatus } from '../types/task'

interface StatusMeta {
  label: string
  tone: BadgeTone
}

// 시안 표기: 할 일 / 진행 중 / 완료
export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  TODO: { label: '할 일', tone: 'muted' },
  IN_PROGRESS: { label: '진행 중', tone: 'info' },
  DONE: { label: '완료', tone: 'ok' },
}

// 시안 표기: 성공 / 실패. 상태 값은 Backend 확정 전 가정 (types/deployment.ts)
export const DEPLOYMENT_STATUS: Record<DeploymentStatus, StatusMeta> = {
  SUCCESS: { label: '성공', tone: 'ok' },
  FAILED: { label: '실패', tone: 'err' },
  IN_PROGRESS: { label: '배포 중', tone: 'info' },
}

// 설계서 4.5 PR 배지: 열림 / 리뷰 중 / 머지됨 (병합=merged 색)
export const PULL_REQUEST_STATUS: Record<PullRequestStatus, StatusMeta> = {
  OPEN: { label: '열림', tone: 'info' },
  IN_REVIEW: { label: '리뷰 중', tone: 'info' },
  MERGED: { label: '머지됨', tone: 'merged' },
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']
