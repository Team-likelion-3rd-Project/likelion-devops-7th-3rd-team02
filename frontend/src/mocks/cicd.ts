import type { Deployment, DeploymentListResponse, PageParams } from '../types/deployment'
import type { Pipeline, PipelineListResponse, PipelineStage } from '../types/pipeline'

// 목 모드(mocks/mockApi.ts)가 쓰는 임시 데이터. Backend 구현 후 목 모드가 필요 없으면 지운다.
const at = (minutesAgo: number) =>
  new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()

const mockDelay = <T>(data: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(data), 300))

const paginate = <T>(items: T[], { page = 0, size = 10 }: PageParams = {}) =>
  items.slice(page * size, page * size + size)

// [이름, 시작(분 전), 소요(초), 상태]
const stages = (
  rows: [PipelineStage['name'], number, number | null, PipelineStage['status']][],
): PipelineStage[] =>
  rows.map(([name, startMinutesAgo, seconds, status]) => ({
    name,
    status,
    startedAt: status === 'PENDING' ? null : at(startMinutesAgo),
    finishedAt:
      seconds === null ? null : new Date(Date.parse(at(startMinutesAgo)) + seconds * 1000).toISOString(),
  }))

const PIPELINES: Pipeline[] = [
  {
    id: 318,
    number: 318,
    status: 'RUNNING',
    branch: 'feature/task-search',
    commitSha: 'a41e9d7c12',
    commitMessage: '작업 검색과 필터 추가',
    startedAt: at(6),
    finishedAt: null,
    stages: stages([
      ['BUILD', 6, 72, 'SUCCESS'],
      ['TEST', 4.8, 123, 'SUCCESS'],
      ['IMAGE', 2.7, 48, 'SUCCESS'],
      ['VERIFY', 1.9, 36, 'SUCCESS'],
      ['DEPLOY', 0.4, null, 'RUNNING'],
    ]),
  },
  {
    id: 317,
    number: 317,
    status: 'SUCCESS',
    branch: 'main',
    commitSha: '7f3c2a1d9e',
    commitMessage: '로그인 만료 처리 추가',
    startedAt: at(23),
    finishedAt: at(18),
    stages: [],
  },
  {
    id: 316,
    number: 316,
    status: 'SUCCESS',
    branch: 'main',
    commitSha: 'b91d04e5a2',
    startedAt: at(60 * 20 + 30),
    finishedAt: at(60 * 20 + 25),
    stages: [],
  },
  {
    id: 315,
    number: 315,
    status: 'FAILED',
    branch: 'main',
    commitSha: '4a8e6c3f71',
    startedAt: at(60 * 26 + 8),
    finishedAt: at(60 * 26 + 5),
    stages: stages([
      ['BUILD', 60 * 26 + 8, 70, 'SUCCESS'],
      ['TEST', 60 * 26 + 7, 90, 'FAILED'],
      ['IMAGE', 0, null, 'PENDING'],
      ['VERIFY', 0, null, 'PENDING'],
      ['DEPLOY', 0, null, 'PENDING'],
    ]),
  },
]

const DEPLOYMENTS: Deployment[] = [
  // health는 최신 배포에만 온다. commitMessage는 못 가져오면 null (Backend 확정)
  { id: 14, revision: 14, imageTag: 'v0.9.3-7f3c2a1', commitSha: '7f3c2a1d9e', commitMessage: '로그인 만료 처리 추가', environment: 'production', status: 'SUCCESS', deployedAt: at(12), health: 'HEALTHY' },
  { id: 13, revision: 13, imageTag: 'v0.9.2-b91d04e', commitSha: 'b91d04e5a2', commitMessage: '배포 이력 페이지 추가', environment: 'production', status: 'SUCCESS', deployedAt: at(60 * 20) },
  { id: 12, revision: 12, imageTag: 'v0.9.1-4a8e6c3', commitSha: '4a8e6c3f71', commitMessage: null, environment: 'production', status: 'FAILED', deployedAt: at(60 * 26) },
]

export const fetchMockPipelines = (params?: PageParams) =>
  mockDelay<PipelineListResponse>({
    pipelines: paginate(PIPELINES, params),
    collectedAt: new Date().toISOString(),
    totalCount: PIPELINES.length,
  })

export const fetchMockDeploymentPage = (params?: PageParams) =>
  mockDelay<DeploymentListResponse>({
    deployments: paginate(DEPLOYMENTS, params),
    collectedAt: new Date().toISOString(),
    totalCount: DEPLOYMENTS.length,
  })
