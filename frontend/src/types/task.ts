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
  // 설계서 6.10 요청 중: 업무 응답의 GitHub 이슈·PR 연결 정보. 응답에 있을 때만 표시한다.
  issue?: TaskIssueLink | null
  pullRequest?: TaskPullRequestLink | null
}

// 아래 연결 정보의 필드명과 PR 상태 값은 Backend 확정 전 가정 (설계서 4.5: 열림, 리뷰 중, 머지됨)
export type PullRequestStatus = 'OPEN' | 'IN_REVIEW' | 'MERGED'

export interface TaskIssueLink {
  number: number
  url: string
}

export interface TaskPullRequestLink {
  number: number
  status: PullRequestStatus
  url: string
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

// GET /projects/{projectId}/tasks 검색·필터 (설계서 6.4 계획). sort 허용 값은 Backend 확인 전 (10.2)
export interface TaskListParams {
  keyword?: string
  status?: TaskStatus
  assigneeId?: number
  page?: number
  size?: number
  sort?: string
}
