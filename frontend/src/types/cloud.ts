// 프로젝트별 클라우드 연결 (Wiki "Backend API 구현 목록" 14장, Backend 확정 2026-10-17)

// CL1·CL2·CL3 응답. Prometheus 토큰 원문은 내려오지 않고 hasToken만 온다.
export interface CloudEnvironment {
  id: number
  name: string
  label: string
  isDefault: boolean
  prometheus: { url: string; hasToken: boolean } | null
  kubernetes: CloudKubernetes | null
  aws: CloudAws | null
  // 사용자 AWS 계정의 읽기 전용 역할 신뢰 정책에 넣을 값. principalArn은 서버 설정이 없으면 null
  awsTrust: { principalArn: string | null; externalId: string }
  createdAt: string
  updatedAt: string
}

export interface CloudKubernetes {
  namespace: string | null
  appDeployment: string | null
  metricsJob: string | null
  nodeLabel: string | null
}

export interface CloudAws {
  region: string
  roleArn: string
  rdsInstanceId: string | null
  loadBalancerArn: string | null
  targetGroupArn: string | null
}

// CL2·CL3 요청. prometheus·aws가 null이면 미연결.
// CL3에서 prometheus.token을 생략하면 기존 토큰 유지, ""이면 삭제
export interface CloudEnvironmentRequest {
  name: string
  label?: string
  isDefault?: boolean
  prometheus: { url: string; token?: string } | null
  kubernetes: Partial<CloudKubernetes> | null
  aws: CloudAws | null
}

// CL5 연결 확인. 실패해도 200으로 결과를 준다.
export type CloudCheckStatus = 'OK' | 'FAILED' | 'NOT_CONFIGURED'

export interface CloudCheckResult {
  status: CloudCheckStatus
  message: string | null
}

export interface CloudTestResponse {
  prometheus: CloudCheckResult
  aws: CloudCheckResult
  checkedAt: string
}

// WT1·WT2 (OWNER). 원문은 발급 응답에서 한 번만 온다.
export type WebhookTokenType = 'deployment' | 'alertmanager'

export interface WebhookTokenSummary {
  type: WebhookTokenType
  createdAt: string
  lastUsedAt: string | null
}

export interface WebhookTokenIssued {
  type: WebhookTokenType
  token: string
  createdAt: string
}
