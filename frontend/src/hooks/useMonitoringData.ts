import { useState } from 'react'

import { fetchMockIncidents } from '../mocks/dashboard'
import {
  fetchMockK8sDeployments,
  fetchMockK8sPods,
  fetchMockMonitoringSummary,
} from '../mocks/monitoring'
import { useAsyncData } from './useAsyncData'
import type { MonitoringRange } from '../types/monitoring'

// 설계서 4.8: 장애, 요약·추이, 배포 상태, 파드를 패널마다 따로 조회한다 (5.1).
// TODO(API): mocks 호출을 api/incidentApi, monitoringApi, k8sApi 로 교체 — Backend 구현 전
export function useMonitoringData(projectId: number) {
  // 기본 범위 1시간 (설계서 3.8)
  const [range, setRange] = useState<MonitoringRange>('1h')

  const incidents = useAsyncData(
    fetchMockIncidents,
    `incidents-${projectId}`,
    '장애 목록을 불러오지 못했습니다.',
  )

  // 범위를 바꾸면 요약과 추이를 같은 range로 다시 조회한다.
  // 응답에 어느 기간의 값인지 함께 담아, 다시 조회하는 동안 라벨과 값이 어긋나지 않게 한다.
  const summary = useAsyncData(
    () => fetchMockMonitoringSummary(range).then((data) => ({ ...data, range })),
    `monitoring-summary-${projectId}-${range}`,
    '모니터링 데이터를 불러오지 못했습니다.',
  )

  const k8sDeployments = useAsyncData(
    fetchMockK8sDeployments,
    `k8s-deployments-${projectId}`,
    '배포 상태를 불러오지 못했습니다.',
  )

  const pods = useAsyncData(
    fetchMockK8sPods,
    `k8s-pods-${projectId}`,
    '파드 목록을 불러오지 못했습니다.',
  )

  const collectedAt =
    summary.data?.collectedAt ??
    k8sDeployments.data?.collectedAt ??
    pods.data?.collectedAt ??
    null

  return { range, setRange, incidents, summary, k8sDeployments, pods, collectedAt }
}
