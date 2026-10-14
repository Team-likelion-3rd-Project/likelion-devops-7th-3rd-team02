import type { DeploymentListResponse } from '../types/deployment'
import type { Incident } from '../types/incident'

// 목 모드(mocks/mockApi.ts)가 쓰는 임시 데이터. Backend 구현 후 목 모드가 필요 없으면 지운다.
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()

const mockDelay = <T>(data: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data), 300))

export const fetchMockDeployments = () =>
  mockDelay<DeploymentListResponse>({
    collectedAt: new Date().toISOString(),
    deployments: [
      {
        id: 3,
        revision: 14,
        imageTag: 'v0.9.3-7f3c2a1',
        commitSha: '7f3c2a1d9e',
        environment: 'production',
        status: 'SUCCESS',
        deployedAt: minutesAgo(12),
      },
      {
        id: 2,
        revision: 13,
        imageTag: 'v0.9.2-b91d04e',
        commitSha: 'b91d04e5a2',
        environment: 'production',
        status: 'SUCCESS',
        deployedAt: minutesAgo(60 * 20),
      },
      {
        id: 1,
        revision: 12,
        imageTag: 'v0.9.1-4a8e6c3',
        commitSha: '4a8e6c3f71',
        environment: 'production',
        status: 'FAILED',
        deployedAt: minutesAgo(60 * 26),
      },
    ],
  })

export const fetchMockIncidents = () =>
  mockDelay<Incident[]>([
    {
      id: 1,
      title: 'api 응답 시간이 기준(1.0초)을 넘고 있습니다.',
      status: 'OPEN',
      severity: 'WARNING',
      occurredAt: minutesAgo(12),
      source: 'Alertmanager',
      assigneeId: null,
      summary: 'p95 1.8초 (기준 1.0초)',
      metric: { currentValue: 1.8, threshold: 1.0, unit: 's' },
      firing: true,
    },
    {
      id: 2,
      title: 'api 파드 재시작이 반복되고 있습니다.',
      status: 'ACKNOWLEDGED',
      severity: 'CRITICAL',
      occurredAt: minutesAgo(90),
      source: 'Alertmanager',
      assigneeId: 1,
      // summary가 없으면 metric으로 요약을 만든다
      metric: { currentValue: 6, threshold: 3, unit: '회' },
      firing: false,
    },
  ])
