import { useState } from 'react'
import { useParams } from 'react-router-dom'

import IncidentAssigneeModal from '../components/monitoring/IncidentAssigneeModal'
import IncidentList from '../components/monitoring/IncidentList'
import K8sDeploymentTable from '../components/monitoring/K8sDeploymentTable'
import PodTable from '../components/monitoring/PodTable'
import RangeSelector from '../components/monitoring/RangeSelector'
import SummaryBar from '../components/monitoring/SummaryBar'
import TrendPanel from '../components/monitoring/TrendPanel'
import { acknowledgeIncident, updateIncidentAssignee } from '../api/incidentApi'
import { useMonitoringData } from '../hooks/useMonitoringData'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { formatClock, isStale } from '../utils/date'
import type { Incident } from '../types/incident'

// 설계서 4.8 모니터링
function MonitoringContent({ projectId }: { projectId: number }) {
  const { range, setRange, incidents, summary, k8sDeployments, pods, collectedAt } =
    useMonitoringData(projectId)
  const { members } = useProjectMembers(projectId)

  const [assigningIncident, setAssigningIncident] = useState<Incident | null>(null)

  // 수집 시각이 오래되면 강조한다 (설계서 5.5).
  const stale = isStale(collectedAt)

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">모니터링</h1>
          {collectedAt && (
            <p className={`mt-1 text-[13px] ${stale ? 'font-semibold text-warn' : 'text-muted'}`}>
              마지막 수집 {formatClock(collectedAt)}
              {stale && ' (지연)'}
            </p>
          )}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      <IncidentList
        incidents={incidents.data}
        members={members}
        isLoading={incidents.isLoading}
        error={incidents.error}
        onRetry={incidents.reload}
        onAcknowledge={async (incident) => {
          await acknowledgeIncident(projectId, incident.id)
          incidents.reload()
        }}
        onAssignRequest={setAssigningIncident}
      />

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

      <K8sDeploymentTable
        deployments={k8sDeployments.data?.deployments}
        isLoading={k8sDeployments.isLoading}
        error={k8sDeployments.error}
        onRetry={k8sDeployments.reload}
      />

      <PodTable
        pods={pods.data?.pods}
        isLoading={pods.isLoading}
        error={pods.error}
        onRetry={pods.reload}
      />

      {assigningIncident && (
        <IncidentAssigneeModal
          incident={assigningIncident}
          members={members}
          onAssign={async (assigneeId) => {
            await updateIncidentAssignee(projectId, assigningIncident.id, assigneeId)
            incidents.reload()
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
