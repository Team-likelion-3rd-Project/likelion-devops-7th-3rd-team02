import type { PageParams } from './deployment'

export type { PageParams }

// 설계서 3.6: 파이프라인 5단계 (화면 표기 Build, Test, Image, Verify, Deploy)
export type PipelineStageName = 'BUILD' | 'TEST' | 'IMAGE' | 'VERIFY' | 'DEPLOY'

// 설계서 6.7 파이프라인 응답: 번호, 상태, 브랜치, 커밋 SHA, 시작·완료 시각, 단계별 상태, collectedAt
// 필드명과 상태 값은 Backend 확정 전 가정이다. 커밋 메시지는 포함 여부 확인 중 (10.2).
export type PipelineStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PENDING'

export interface PipelineStage {
  name: PipelineStageName
  status: PipelineStatus
  startedAt: string | null
  finishedAt: string | null
}

export interface Pipeline {
  id: number
  number: number
  status: PipelineStatus
  branch: string
  commitSha: string
  commitMessage?: string | null
  startedAt: string | null
  finishedAt: string | null
  stages: PipelineStage[]
}

export interface PipelineListResponse {
  pipelines: Pipeline[]
  collectedAt: string
  // 전체 건수 포함 여부는 Backend 확인 전 (설계서 10.2)
  totalCount?: number
}
