import { useState } from 'react'

import {
  fetchMockDeploymentPage,
  fetchMockGithubRepository,
  fetchMockGitlabIntegration,
  fetchMockPipelines,
} from '../mocks/cicd'
import { useAsyncData } from './useAsyncData'

export const CICD_PAGE_SIZE = 10

// 설계서 4.7: 패널마다 따로 조회해 한 영역의 지연·오류가 다른 영역을 가리지 않게 한다 (5.1, 5.2).
// TODO(API): mocks/cicd 호출을 api/cicdApi, deploymentApi, integrationApi 로 교체 — Backend 구현 전
export function useCicdData(projectId: number) {
  const [pipelinePage, setPipelinePage] = useState(0)
  const [deploymentPage, setDeploymentPage] = useState(0)

  const github = useAsyncData(
    fetchMockGithubRepository,
    `github-repository-${projectId}`,
    'GitHub 저장소 정보를 불러오지 못했습니다.',
  )

  const gitlab = useAsyncData(
    fetchMockGitlabIntegration,
    `gitlab-integration-${projectId}`,
    'GitLab 연결 정보를 불러오지 못했습니다.',
  )

  // 현재 배포와 진행 중 파이프라인은 각 목록의 최신 항목이다 (설계서 4.7, 3.6).
  const latestPipeline = useAsyncData(
    () => fetchMockPipelines({ page: 0, size: 1 }),
    `pipelines-latest-${projectId}`,
    '파이프라인을 불러오지 못했습니다.',
  )

  const latestDeployment = useAsyncData(
    () => fetchMockDeploymentPage({ page: 0, size: 1 }),
    `deployments-latest-${projectId}`,
    '현재 배포를 불러오지 못했습니다.',
  )

  const pipelines = useAsyncData(
    () => fetchMockPipelines({ page: pipelinePage, size: CICD_PAGE_SIZE }),
    `pipelines-${projectId}-${pipelinePage}`,
    '파이프라인 이력을 불러오지 못했습니다.',
  )

  const deployments = useAsyncData(
    () => fetchMockDeploymentPage({ page: deploymentPage, size: CICD_PAGE_SIZE }),
    `deployments-${projectId}-${deploymentPage}`,
    '배포 이력을 불러오지 못했습니다.',
  )

  const collectedAt =
    latestPipeline.data?.collectedAt ?? latestDeployment.data?.collectedAt ?? null

  return {
    github,
    gitlab,
    latestPipeline,
    latestDeployment,
    pipelines,
    pipelinePage,
    setPipelinePage,
    deployments,
    deploymentPage,
    setDeploymentPage,
    collectedAt,
  }
}
