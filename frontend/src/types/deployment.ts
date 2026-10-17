// 설계서 6.7 배포 응답: 커밋 SHA, 이미지 태그, 상태, 배포 시각, 리비전, 환경, collectedAt
// 필드명과 상태 값은 Backend 확정 전 가정이다. 확정되면 이 파일만 맞춘다.
export type DeploymentStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS'

// 실행 중인 애플리케이션 상태 (Backend 확정). 최신 배포에만 온다.
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN'

export interface Deployment {
  id: number
  revision: number
  imageTag: string
  commitSha: string
  // CI가 배포 기록(D3)에 담아 보낸다. 없으면 null (Backend 확정)
  commitMessage?: string | null
  environment: string
  status: DeploymentStatus
  deployedAt: string
  health?: HealthStatus | null
}

export interface DeploymentListResponse {
  deployments: Deployment[]
  collectedAt: string
  // 전체 건수 포함 여부는 Backend 확인 전 (설계서 10.2)
  totalCount?: number
}

export interface PageParams {
  page?: number
  size?: number
}
