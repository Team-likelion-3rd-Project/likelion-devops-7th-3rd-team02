import { getTasks } from '../api/taskApi'
import { fetchMockDeployments, fetchMockIncidents } from '../mocks/dashboard'
import { useAsyncData } from './useAsyncData'

// 설계서 4.4: 내 작업, 최근 배포, 장애 배너는 현재 선택된 프로젝트 기준
export function useDashboardData(
  projectId: number | null,
  userId: number | null,
) {
  const myTasks = useAsyncData(
    () =>
      getTasks(projectId!, { assigneeId: userId! }).then(
        (response) => response.data.data ?? [],
      ),
    projectId !== null && userId !== null ? `tasks-${projectId}-${userId}` : null,
    '내 작업을 불러오지 못했습니다.',
  )

  // TODO(API): getDeployments(projectId) 로 교체 — 배포 API Backend 구현 전
  const deployments = useAsyncData(
    fetchMockDeployments,
    projectId !== null ? `deployments-${projectId}` : null,
    '최근 배포를 불러오지 못했습니다.',
  )

  // TODO(API): getIncidents(projectId) 로 교체 — 장애 API Backend 구현 전
  const incidents = useAsyncData(
    fetchMockIncidents,
    projectId !== null ? `incidents-${projectId}` : null,
    '장애 정보를 불러오지 못했습니다.',
  )

  return { myTasks, deployments, incidents }
}
