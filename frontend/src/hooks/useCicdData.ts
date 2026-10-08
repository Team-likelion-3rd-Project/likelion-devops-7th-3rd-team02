import { useState } from 'react'

import { getPipelines } from '../api/cicdApi'
import { getDeployments } from '../api/deploymentApi'
import { getGithubRepository, getGitlabIntegration } from '../api/integrationApi'
import { useAsyncData } from './useAsyncData'

export const CICD_PAGE_SIZE = 10

// 설계서 4.7: 패널마다 따로 조회해 한 영역의 지연·오류가 다른 영역을 가리지 않게 한다 (5.1, 5.2).
export function useCicdData(projectId: number) {
  const [pipelinePage, setPipelinePage] = useState(0)
  const [deploymentPage, setDeploymentPage] = useState(0)

  const github = useAsyncData(
    () => getGithubRepository(projectId).then((response) => response.data.data ?? null),
    `github-repository-${projectId}`,
    'GitHub 저장소 정보를 불러오지 못했습니다.',
  )

  const gitlab = useAsyncData(
    () => getGitlabIntegration(projectId).then((response) => response.data.data ?? null),
    `gitlab-integration-${projectId}`,
    'GitLab 연결 정보를 불러오지 못했습니다.',
  )

  // 현재 배포와 진행 중 파이프라인은 각 목록의 최신 항목이다 (설계서 4.7, 3.6).
  const latestPipeline = useAsyncData(
    () => getPipelines(projectId, { page: 0, size: 1 }).then((response) => response.data.data),
    `pipelines-latest-${projectId}`,
    '파이프라인을 불러오지 못했습니다.',
  )

  const latestDeployment = useAsyncData(
    () => getDeployments(projectId, { page: 0, size: 1 }).then((response) => response.data.data),
    `deployments-latest-${projectId}`,
    '현재 배포를 불러오지 못했습니다.',
  )

  const pipelines = useAsyncData(
    () =>
      getPipelines(projectId, { page: pipelinePage, size: CICD_PAGE_SIZE }).then(
        (response) => response.data.data,
      ),
    `pipelines-${projectId}-${pipelinePage}`,
    '파이프라인 이력을 불러오지 못했습니다.',
  )

  const deployments = useAsyncData(
    () =>
      getDeployments(projectId, { page: deploymentPage, size: CICD_PAGE_SIZE }).then(
        (response) => response.data.data,
      ),
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
