// 설계서 6.7 배포 응답: 커밋 SHA, 이미지 태그, 상태, 배포 시각, 리비전, 환경, collectedAt
// 필드명과 상태 값은 Backend 확정 전 가정이다. 확정되면 이 파일만 맞춘다.
export type DeploymentStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS'

export interface Deployment {
  id: number
  revision: number
  imageTag: string
  commitSha: string
  environment: string
  status: DeploymentStatus
  deployedAt: string
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
