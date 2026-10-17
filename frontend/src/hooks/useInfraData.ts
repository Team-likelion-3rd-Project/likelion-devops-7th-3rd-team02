import {
  getDatabaseStatus,
  getK8sHpas,
  getK8sNodes,
  getLoadBalancerStatus,
} from '../api/environmentApi'
import { useAsyncData } from './useAsyncData'

// 모니터링 인프라 탭 (E2~E5). 탭을 열었을 때만 조회하고, 패널마다 따로 조회한다 (설계서 5.1).
// env가 null이면 프로젝트 기본 환경 (env 생략)
export function useInfraData(projectId: number, env: string | null, enabled: boolean) {
  const envKey = env ?? 'default'
  const envParam = env ?? undefined
  const key = (name: string) => (enabled ? `${name}-${projectId}-${envKey}` : null)

  const nodes = useAsyncData(
    () => getK8sNodes(projectId, envParam).then((response) => response.data.data),
    key('k8s-nodes'),
    '노드 상태를 불러오지 못했습니다.',
  )

  const hpas = useAsyncData(
    () => getK8sHpas(projectId, envParam).then((response) => response.data.data),
    key('k8s-hpa'),
    'HPA 상태를 불러오지 못했습니다.',
  )

  const database = useAsyncData(
    () => getDatabaseStatus(projectId, envParam).then((response) => response.data.data),
    key('cloud-database'),
    'DB 상태를 불러오지 못했습니다.',
  )

  const loadBalancer = useAsyncData(
    () => getLoadBalancerStatus(projectId, envParam).then((response) => response.data.data),
    key('cloud-load-balancer'),
    '로드밸런서 상태를 불러오지 못했습니다.',
  )

  const collectedAt =
    nodes.data?.collectedAt ?? hpas.data?.collectedAt ?? database.data?.collectedAt ?? loadBalancer.data?.collectedAt ?? null

  return { nodes, hpas, database, loadBalancer, collectedAt }
}
