// 설계서 6.8 Kubernetes·모니터링 응답 (Backend 확정).
// 세 응답 모두 collectedAt을 포함한다 (확정).

// 기간: 1시간, 6시간, 24시간 (설계서 3.8, Backend 확정)
export type MonitoringRange = '1h' | '6h' | '24h'

// range를 주면 CPU·메모리·오류율·응답 시간이 시계열로 온다 (확정)
export interface MetricPoint {
  timestamp: string
  errorRate: number
  responseTimeMs: number
  cpuUsage: number
  memoryUsage: number
}

// 요약: CPU, 메모리, HTTP 요청 수, 오류율, 응답 시간, 레플리카 수, 파드 상태
export interface MonitoringSummary {
  httpRequestCount: number
  errorRate: number
  avgResponseTimeMs: number
  cpuUsage: number
  memoryUsage: number
  replicas: { ready: number; desired: number }
  series: MetricPoint[]
  collectedAt: string
}

// 배포 상태: Desired, Available, Ready, Updated Replicas
export interface K8sDeployment {
  name: string
  desiredReplicas: number
  availableReplicas: number
  readyReplicas: number
  updatedReplicas: number
}

export interface K8sDeploymentListResponse {
  deployments: K8sDeployment[]
  collectedAt: string
}

// 파드: 이름, 상태, 준비 여부, 재시작 횟수, 생성 시간, 이미지
export interface K8sPod {
  name: string
  status: string
  readyContainers: number
  totalContainers: number
  restartCount: number
  createdAt: string
  image: string
}

export interface K8sPodListResponse {
  pods: K8sPod[]
  collectedAt: string
}
