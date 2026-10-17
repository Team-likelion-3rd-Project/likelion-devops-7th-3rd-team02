// 환경·인프라 상태 (Wiki "Backend API 구현 목록" 12장 E1~E5, 14.2). env를 생략하면 프로젝트 기본 환경

export type EnvironmentHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'

// null: 정상 수집 / NOT_CONNECTED: Prometheus 미연결 / UNREACHABLE: 연결 실패 / NOT_DEPLOYED: 배포 기록 없음
export type EnvironmentReason = 'NOT_CONNECTED' | 'UNREACHABLE' | 'NOT_DEPLOYED'

// E1 GET /projects/{projectId}/environments — 연결한 환경이 없으면 []
export interface EnvironmentSummary {
  name: string
  label: string
  health: EnvironmentHealth
  reason: EnvironmentReason | null
  currentImageTag: string | null
  lastDeployedAt: string | null
  replicas: { ready: number; desired: number } | null
  openIncidents: number
  // UNREACHABLE이면 마지막으로 수집에 성공한 시각 (한 번도 없으면 null)
  collectedAt: string | null
}

// E2 GET /projects/{projectId}/k8s/nodes
export interface K8sNode {
  name: string
  roles: string[]
  ready: boolean
  cpuUsage: number | null
  memoryUsage: number | null
  kubeletVersion: string
  createdAt: string
}

export interface K8sNodeListResponse {
  nodes: K8sNode[]
  collectedAt: string
}

// E3 GET /projects/{projectId}/k8s/hpa — HPA가 없으면 hpas: []
export interface K8sHpa {
  name: string
  target: string
  currentReplicas: number | null
  desiredReplicas: number | null
  minReplicas: number | null
  maxReplicas: number | null
  currentCpuUtilization: number | null
  targetCpuUtilization: number | null
}

export interface K8sHpaListResponse {
  hpas: K8sHpa[]
  collectedAt: string
}

// E4 GET /projects/{projectId}/cloud/database — 가져올 수 없는 값은 null
export interface DatabaseStatus {
  source: 'RDS' | 'PROMETHEUS'
  identifier: string | null
  engine: string | null
  // RDS 값을 대문자·밑줄로 (AVAILABLE, BACKING_UP 등), 지표 없음 UNKNOWN
  status: string
  multiAz: boolean | null
  cpuUsage: number | null
  connections: number | null
  storageUsedGb: number | null
  freeStorageGb: number | null
  lastBackupAt: string | null
  collectedAt: string
}

// E5 GET /projects/{projectId}/cloud/load-balancer — 요청 수·5xx 수는 최근 5분 합계
export interface LoadBalancerStatus {
  source: 'ALB' | 'PROMETHEUS'
  name: string | null
  healthyTargets: number
  unhealthyTargets: number
  requestCount: number | null
  http5xxCount: number | null
  avgResponseTimeMs: number | null
  collectedAt: string
}
