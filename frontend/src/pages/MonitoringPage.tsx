import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useParams } from 'react-router-dom'

import CloudConnectNotice from '../components/common/CloudConnectNotice'
import { focusRing } from '../components/common/styles'
import EnvironmentSelector from '../components/monitoring/EnvironmentSelector'
import IncidentAssigneeModal from '../components/monitoring/IncidentAssigneeModal'
import IncidentList from '../components/monitoring/IncidentList'
import InfraPanels from '../components/monitoring/InfraPanels'
import K8sDeploymentTable from '../components/monitoring/K8sDeploymentTable'
import PodTable from '../components/monitoring/PodTable'
import RangeSelector from '../components/monitoring/RangeSelector'
import SummaryBar from '../components/monitoring/SummaryBar'
import TrendPanel from '../components/monitoring/TrendPanel'
import { acknowledgeIncident, resolveIncident, updateIncidentAssignee } from '../api/incidentApi'
import { useInfraData } from '../hooks/useInfraData'
import { useMonitoringData } from '../hooks/useMonitoringData'
import { useProjectContext } from '../hooks/useProjectContext'
import { formatClock, isStale } from '../utils/date'
import { CLOUD_NOT_CONNECTED } from '../utils/error'
import { notifyIncidentsChanged } from '../utils/monitoring'
import { isProjectOwner } from '../utils/projectRole'
import type { Incident } from '../types/incident'

type View = 'app' | 'infra'

const VIEWS: { value: View; label: string }[] = [
  { value: 'app', label: '앱' },
  { value: 'infra', label: '인프라' },
]

// 설계서 4.8 모니터링: 장애는 위에 공통, 아래는 [앱] 지표·배포 상태·파드 / [인프라] 노드·HPA·DB·로드밸런서
function MonitoringContent({ projectId }: { projectId: number }) {
  const {
    range,
    setRange,
    env,
    setEnv,
    environments,
    hasNoEnvironment,
    incidents,
    summary,
    k8sDeployments,
    pods,
    collectedAt,
  } = useMonitoringData(projectId)
  const { currentProject, members } = useProjectContext()
  const canConnect = isProjectOwner(currentProject)

  const [view, setView] = useState<View>('app')
  const infra = useInfraData(projectId, env, view === 'infra' && !hasNoEnvironment && environments.data !== null)

  // 탭 사이를 화살표 키로 옮긴다 (WAI-ARIA tabs).
  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = view === 'app' ? 'infra' : 'app'
    setView(next)
    document.getElementById(`monitoring-tab-${next}`)?.focus()
  }

  // 환경은 있지만 필요한 연결(Prometheus, 지표 job 등)이 없으면 그 패널만 안내로 바꾼다 (Backend 14.2).
  // 세 조회가 모두 같은 이유로 막히면 안내 하나로 합친다.
  const isNotConnected = (state: { errorCode: string }) => state.errorCode === CLOUD_NOT_CONNECTED
  const opsStates = [summary, k8sDeployments, pods]
  const isAllNotConnected = hasNoEnvironment || opsStates.every(isNotConnected)

  const notice = (title: string, message: string) => (
    <CloudConnectNotice
      projectId={projectId}
      canConnect={canConnect}
      title={title}
      message={message}
      className="mb-5"
    />
  )

  const [assigningIncident, setAssigningIncident] = useState<Incident | null>(null)

  // 수집 시각이 오래되면 강조한다 (설계서 5.5). 보고 있는 탭의 수집 시각을 쓴다.
  const shownCollectedAt = view === 'app' ? collectedAt : infra.collectedAt
  const stale = isStale(shownCollectedAt)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">모니터링</h1>
          {shownCollectedAt && (
            <p className={`mt-1 text-[13px] ${stale ? 'font-semibold text-warn' : 'text-muted'}`}>
              마지막 수집 {formatClock(shownCollectedAt)}
              {stale && ' (지연)'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EnvironmentSelector environments={environments.data ?? []} value={env} onChange={setEnv} />
          {/* 기간은 앱 지표(O1)에만 쓰인다. 인프라는 현재 상태다. */}
          {!isAllNotConnected && view === 'app' && <RangeSelector value={range} onChange={setRange} />}
        </div>
      </div>

      <IncidentList
        incidents={incidents.data}
        members={members}
        isLoading={incidents.isLoading}
        error={incidents.error}
        onRetry={incidents.reload}
        onAcknowledge={async (incident) => {
          // 다른 팀원이 먼저 처리했을 수 있으니 실패해도 목록을 다시 불러온다 (오류 문구는 IncidentList가 표시).
          try {
            await acknowledgeIncident(projectId, incident.id)
          } finally {
            incidents.reload()
            notifyIncidentsChanged()
          }
        }}
        onAssignRequest={setAssigningIncident}
        onResolve={async (incident) => {
          // 다른 팀원이 먼저 해결했으면 409. 그래도 목록과 배지를 다시 불러온다.
          try {
            await resolveIncident(projectId, incident.id)
          } finally {
            incidents.reload()
            notifyIncidentsChanged()
          }
        }}
      />

      {!hasNoEnvironment && (
        <div
          role="tablist"
          aria-label="모니터링 보기"
          onKeyDown={handleTabKeyDown}
          className="mb-3.5 flex w-fit overflow-hidden rounded-lg border border-line"
        >
          {VIEWS.map((item) => {
            const isActive = view === item.value
            return (
              <button
                key={item.value}
                id={`monitoring-tab-${item.value}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="monitoring-view"
                tabIndex={isActive ? 0 : -1}
                onClick={() => setView(item.value)}
                className={`flex h-8 cursor-pointer items-center px-4 ${focusRing} focus-visible:-outline-offset-2 ${
                  isActive ? 'bg-accent-bg font-semibold text-accent' : 'font-medium text-muted hover:bg-hover'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      <div
        id="monitoring-view"
        role={hasNoEnvironment ? undefined : 'tabpanel'}
        aria-labelledby={hasNoEnvironment ? undefined : `monitoring-tab-${view}`}
      >
        {view === 'infra' && !hasNoEnvironment ? (
          <InfraPanels
            projectId={projectId}
            canConnect={canConnect}
            nodes={infra.nodes}
            hpas={infra.hpas}
            database={infra.database}
            loadBalancer={infra.loadBalancer}
          />
        ) : isAllNotConnected ? (
          notice(
            '운영 상태',
            hasNoEnvironment
              ? '클라우드를 연결하면 배포 상태, 파드, 지표가 보여요. 장애 알림은 연결과 따로 받아요.'
              : summary.error,
          )
        ) : (
          <>
            {isNotConnected(summary) ? (
              notice('지표', summary.error)
            ) : (
              <>
                <SummaryBar
                  summary={summary.data}
                  range={summary.data?.range ?? range}
                  isLoading={summary.isLoading}
                  error={summary.error}
                  onRetry={summary.reload}
                />

                <TrendPanel
                  series={summary.data?.series ?? null}
                  range={summary.data?.range ?? range}
                  isLoading={summary.isLoading}
                  error={summary.error}
                  onRetry={summary.reload}
                />
              </>
            )}

            {isNotConnected(k8sDeployments) ? (
              notice('배포 상태', k8sDeployments.error)
            ) : (
              <K8sDeploymentTable
                deployments={k8sDeployments.data?.deployments}
                isLoading={k8sDeployments.isLoading}
                error={k8sDeployments.error}
                onRetry={k8sDeployments.reload}
              />
            )}

            {isNotConnected(pods) ? (
              notice('파드', pods.error)
            ) : (
              <PodTable
                pods={pods.data?.pods}
                isLoading={pods.isLoading}
                error={pods.error}
                onRetry={pods.reload}
              />
            )}
          </>
        )}
      </div>

      {assigningIncident && (
        <IncidentAssigneeModal
          incident={assigningIncident}
          members={members}
          onAssign={async (assigneeId) => {
            await updateIncidentAssignee(projectId, assigningIncident.id, assigneeId)
            incidents.reload()
            notifyIncidentsChanged()
          }}
          onClose={() => setAssigningIncident(null)}
        />
      )}
    </>
  )
}

// 프로젝트가 바뀌면 기간 선택 등 상태를 새로 시작한다.
function MonitoringPage() {
  const params = useParams()
  const projectId = params.projectId ? Number(params.projectId) : null

  if (projectId === null || Number.isNaN(projectId)) {
    return null
  }

  return <MonitoringContent key={projectId} projectId={projectId} />
}

export default MonitoringPage
