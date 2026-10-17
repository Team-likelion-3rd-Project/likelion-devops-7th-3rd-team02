import { Link } from 'react-router-dom'

import CloudConnectNotice from '../common/CloudConnectNotice'
import StatusBadge from '../common/StatusBadge'
import { ErrorMessage } from '../common/PanelState'
import { focusRing } from '../common/styles'
import { getEnvironmentSummaries } from '../../api/environmentApi'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatRelativeTime } from '../../utils/date'
import { ENVIRONMENT_HEALTH, ENVIRONMENT_REASON } from '../../utils/status'
import type { EnvironmentSummary as Environment } from '../../types/environment'

const mono = 'font-mono text-[12.5px]'

function EnvironmentCard({ projectId, environment }: { projectId: number; environment: Environment }) {
  const health = ENVIRONMENT_HEALTH[environment.health]

  return (
    <li>
      {/* 누르면 그 환경을 고른 채로 모니터링을 연다. */}
      <Link
        to={`/projects/${projectId}/monitoring?env=${encodeURIComponent(environment.name)}`}
        className={`flex h-full flex-col gap-3 rounded-xl border border-line bg-panel px-4 py-3.5 shadow-panel hover:bg-hover ${focusRing}`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <b title={environment.label} className="block truncate font-semibold">
              {environment.label}
            </b>
            <span className={`block truncate text-muted ${mono}`}>{environment.name}</span>
          </span>
          <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
        </span>

        {environment.reason && (
          <span className="text-[13px] break-keep text-muted">{ENVIRONMENT_REASON[environment.reason]}</span>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
          <div className="col-span-2 min-w-0">
            <dt className="text-[12.5px] text-muted">현재 버전</dt>
            <dd title={environment.currentImageTag ?? undefined} className={`truncate ${mono}`}>
              {environment.currentImageTag ?? '-'}
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-muted">레플리카</dt>
            <dd>{environment.replicas ? `${environment.replicas.ready}/${environment.replicas.desired}` : '-'}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-muted">열린 장애</dt>
            <dd className={environment.openIncidents > 0 ? 'font-semibold text-warn' : ''}>
              {environment.openIncidents}건
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[12.5px] text-muted">마지막 배포</dt>
            <dd>{environment.lastDeployedAt ? formatRelativeTime(environment.lastDeployedAt) : '-'}</dd>
          </div>
        </dl>
      </Link>
    </li>
  )
}

// 설계서 4.4 대시보드 환경 카드 (E1): 프로젝트에 연결한 환경마다 상태, 현재 버전, 레플리카, 열린 장애
// 데이터를 못 가져온 환경도 빼지 않고 "확인 불가"와 이유를 보여준다 (Backend 12.2).
function EnvironmentSummary({ projectId, canConnect }: { projectId: number; canConnect: boolean }) {
  const environments = useAsyncData(
    () => getEnvironmentSummaries(projectId).then((response) => response.data.data ?? []),
    `environment-summaries-${projectId}`,
    '환경 상태를 불러오지 못했습니다.',
  )

  if (environments.error) {
    return (
      <section aria-label="환경" className="mb-5 rounded-xl border border-line bg-panel">
        <ErrorMessage message={environments.error} onRetry={environments.reload} />
      </section>
    )
  }

  // 처음 불러오는 동안에는 표시하지 않는다.
  if (environments.data === null) return null

  if (environments.data.length === 0) {
    return (
      <CloudConnectNotice
        projectId={projectId}
        canConnect={canConnect}
        title="환경"
        message="클라우드를 연결하면 환경마다 상태, 현재 버전, 열린 장애가 여기에 보여요."
        className="mb-5"
      />
    )
  }

  return (
    <section aria-label="환경" className="mb-5">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
        {environments.data.map((environment) => (
          <EnvironmentCard key={environment.name} projectId={projectId} environment={environment} />
        ))}
      </ul>
    </section>
  )
}

export default EnvironmentSummary
