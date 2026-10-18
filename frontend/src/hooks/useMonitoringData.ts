import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { getCloudEnvironments } from '../api/cloudApi'
import { getIncidents } from '../api/incidentApi'
import { getK8sDeployments, getK8sPods } from '../api/k8sApi'
import { getMonitoringSummary } from '../api/monitoringApi'
import { useAsyncData } from './useAsyncData'
import type { MonitoringRange } from '../types/monitoring'

// 설계서 4.8: 장애, 요약·추이, 배포 상태, 파드를 패널마다 따로 조회한다 (5.1).
// 운영 상태는 프로젝트에 연결한 클라우드 환경(CL1)마다 다르다 (Backend 14.2).
export function useMonitoringData(projectId: number) {
  // 기본 범위 1시간 (설계서 3.8)
  const [range, setRange] = useState<MonitoringRange>('1h')
  // null: 프로젝트 기본 환경 (env 생략). 대시보드 환경 카드는 ?env=로 고른 채 들어온다.
  const [searchParams] = useSearchParams()
  const [env, setEnv] = useState<string | null>(() => searchParams.get('env'))

  const incidents = useAsyncData(
    () => getIncidents(projectId).then((response) => response.data.data ?? []),
    `incidents-${projectId}`,
    '장애 목록을 불러오지 못했습니다.',
  )

  const environments = useAsyncData(
    () => getCloudEnvironments(projectId).then((response) => response.data.data ?? []),
    `cloud-environments-${projectId}`,
    '환경 목록을 불러오지 못했습니다.',
  )

  // 환경이 하나도 없으면 운영 상태 API는 모두 CLOUD_NOT_CONNECTED라 부르지 않는다.
  // 환경 목록을 못 불러온 경우에는 기본 환경으로 그대로 조회해 각 패널이 결과를 보여준다.
  const hasNoEnvironment = environments.data !== null && environments.data.length === 0
  const canQueryOps = (environments.data !== null || environments.error !== '') && !hasNoEnvironment
  // 주소의 env가 프로젝트에 없는 환경이면 기본 환경으로 본다.
  const knownEnv =
    env !== null && environments.data !== null && !environments.data.some((item) => item.name === env)
      ? null
      : env
  const envKey = knownEnv ?? 'default'
  const envParam = knownEnv ?? undefined

  // 범위를 바꾸면 요약과 추이를 같은 range로 다시 조회한다.
  // 응답에 어느 기간의 값인지 함께 담아, 다시 조회하는 동안 라벨과 값이 어긋나지 않게 한다.
  const summary = useAsyncData(
    () =>
      getMonitoringSummary(projectId, range, envParam).then((response) => ({
        ...response.data.data,
        range,
      })),
    canQueryOps ? `monitoring-summary-${projectId}-${envKey}-${range}` : null,
    '모니터링 데이터를 불러오지 못했습니다.',
  )

  const k8sDeployments = useAsyncData(
    () => getK8sDeployments(projectId, envParam).then((response) => response.data.data),
    canQueryOps ? `k8s-deployments-${projectId}-${envKey}` : null,
    '배포 상태를 불러오지 못했습니다.',
  )

  const pods = useAsyncData(
    () => getK8sPods(projectId, envParam).then((response) => response.data.data),
    canQueryOps ? `k8s-pods-${projectId}-${envKey}` : null,
    '파드 목록을 불러오지 못했습니다.',
  )

  // 환경 목록을 기다리는 동안에는 운영 패널을 불러오는 중으로 보여준다.
  const isEnvironmentLoading = environments.data === null && environments.error === ''
  const withEnvironmentLoading = <T extends { isLoading: boolean }>(state: T): T => ({
    ...state,
    isLoading: state.isLoading || isEnvironmentLoading,
  })

  // 환경이 없으면 수집 시각도 표시하지 않는다.
  const collectedAt = canQueryOps
    ? (summary.data?.collectedAt ?? k8sDeployments.data?.collectedAt ?? pods.data?.collectedAt ?? null)
    : null

  return {
    range,
    setRange,
    env: knownEnv,
    setEnv,
    environments,
    hasNoEnvironment,
    incidents,
    summary: withEnvironmentLoading(summary),
    k8sDeployments: withEnvironmentLoading(k8sDeployments),
    pods: withEnvironmentLoading(pods),
    collectedAt,
  }
}
