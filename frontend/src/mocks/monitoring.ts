import type {
  K8sDeploymentListResponse,
  K8sPodListResponse,
  MetricPoint,
  MonitoringRange,
  MonitoringSummary,
} from '../types/monitoring'
import { RANGE_MINUTES } from '../utils/monitoring'

// 목 모드(mocks/mockApi.ts)가 쓰는 임시 데이터. Backend 구현 후 목 모드가 필요 없으면 지운다.
const at = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()

const mockDelay = <T>(data: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data), 300))


// 시안 추이와 비슷한 모양의 12개 점
const ERROR_RATE = [0.4, 0.5, 0.4, 0.6, 0.5, 0.7, 0.9, 1.4, 1.1, 0.8, 0.7, 0.6]
const RESPONSE_MS = [380, 400, 430, 470, 530, 660, 960, 1500, 2150, 2370, 2290, 1930]
const CPU = [42, 44, 43, 46, 49, 52, 60, 66, 63, 60, 57, 55]
const MEMORY = [69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74]

export const fetchMockMonitoringSummary = (range: MonitoringRange) => {
  const minutes = RANGE_MINUTES[range]
  const step = minutes / (ERROR_RATE.length - 1)

  const series: MetricPoint[] = ERROR_RATE.map((errorRate, index) => ({
    timestamp: at(minutes - step * index),
    errorRate,
    responseTimeMs: RESPONSE_MS[index],
    cpuUsage: CPU[index],
    memoryUsage: MEMORY[index],
  }))

  return mockDelay<MonitoringSummary>({
    httpRequestCount: Math.round(307 * minutes),
    errorRate: 0.6,
    avgResponseTimeMs: 1500,
    cpuUsage: 55,
    memoryUsage: 74,
    replicas: { ready: 3, desired: 3 },
    series,
    collectedAt: new Date().toISOString(),
  })
}

export const fetchMockK8sDeployments = () =>
  mockDelay<K8sDeploymentListResponse>({
    deployments: [
      { name: 'devflow-api', desiredReplicas: 3, availableReplicas: 3, readyReplicas: 3, updatedReplicas: 3 },
      { name: 'devflow-web', desiredReplicas: 2, availableReplicas: 2, readyReplicas: 2, updatedReplicas: 2 },
    ],
    collectedAt: new Date().toISOString(),
  })

export const fetchMockK8sPods = () =>
  mockDelay<K8sPodListResponse>({
    pods: [
      { name: 'devflow-api-7d9f-x2k8p', status: 'Running', readyContainers: 1, totalContainers: 1, restartCount: 3, createdAt: at(12), image: 'api:v0.9.3-7f3c2a1' },
      { name: 'devflow-api-7d9f-m4n7q', status: 'Running', readyContainers: 1, totalContainers: 1, restartCount: 0, createdAt: at(12), image: 'api:v0.9.3-7f3c2a1' },
      { name: 'devflow-api-7d9f-q9z1c', status: 'Running', readyContainers: 1, totalContainers: 1, restartCount: 0, createdAt: at(12), image: 'api:v0.9.3-7f3c2a1' },
      { name: 'devflow-web-5c8b-h2t6w', status: 'Running', readyContainers: 1, totalContainers: 1, restartCount: 0, createdAt: at(60 * 48), image: 'web:v0.9.0-e03a1b2' },
    ],
    collectedAt: new Date().toISOString(),
  })
