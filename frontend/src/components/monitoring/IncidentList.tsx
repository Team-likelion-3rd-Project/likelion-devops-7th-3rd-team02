import { useState } from 'react'

import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { formatSince } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import { incidentSummary, isOpenIncident, needsCheck } from '../../utils/monitoring'
import { INCIDENT_SEVERITY } from '../../utils/status'
import type { Incident } from '../../types/incident'
import type { ProjectMember } from '../../types/member'

const smallButton = 'h-7 px-2.5 text-[13px]'

// 설계서 4.8 장애 목록: 심각도, 제목, 발생 후 경과, 출처, 담당자, 상태, 확인·담당자 지정
// 확인 버튼은 OPEN 장애에만 활성화하고, 확인 후에도 담당자 지정은 별도로 할 수 있다 (3.7).
// 권한(OWNER 한정 여부)은 확정 전이라 모두에게 표시하고 Backend 403을 오류로 보여준다.
function IncidentList({
  incidents,
  members,
  isLoading,
  error,
  onRetry,
  onAcknowledge,
  onAssignRequest,
}: {
  incidents: Incident[] | null
  members: ProjectMember[]
  isLoading: boolean
  error: string
  onRetry: () => void
  onAcknowledge: (incident: Incident) => Promise<void>
  onAssignRequest: (incident: Incident) => void
}) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  // 열린 장애: 해결되지 않은 장애
  const openIncidents = (incidents ?? []).filter(isOpenIncident)
  const uncheckedCount = openIncidents.filter(needsCheck).length

  const memberName = (userId: number | null) =>
    members.find((member) => member.userId === userId)?.name ?? null

  const handleAcknowledge = async (incident: Incident) => {
    setPendingId(incident.id)
    setActionError('')

    try {
      await onAcknowledge(incident)
    } catch (error) {
      setActionError(getErrorMessage(error, '장애를 확인 처리하지 못했습니다.'))
    } finally {
      setPendingId(null)
    }
  }

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !incidents) return <Loading message="장애 목록을 불러오는 중입니다." />
    if (openIncidents.length === 0) return <EmptyState message="열린 장애가 없어요." />

    return (
      <ul>
        {openIncidents.map((incident) => {
          const severity = INCIDENT_SEVERITY[incident.severity]
          const assignee = memberName(incident.assigneeId)
          const summary = incidentSummary(incident)

          return (
            <li
              key={incident.id}
              className="flex flex-wrap items-center gap-3.5 border-b border-line2 px-[18px] py-3.5 last:border-b-0"
            >
              <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>

              <div className="min-w-0 flex-1">
                <b className="block font-semibold">{incident.title}</b>
                {summary && <span className="block text-[13px]">{summary}</span>}
                <span className="text-[12.5px] text-muted">
                  {formatSince(incident.occurredAt)}, 출처 {incident.source}
                </span>
              </div>

              {/* firing이 false면 알림이 풀린 상태다. 확인한 장애는 30분 뒤 자동으로 해결된다 (Backend). */}
              {incident.firing === false && <StatusBadge tone="muted">현재 안정화됨</StatusBadge>}

              <span className={`text-[12.5px] ${assignee ? '' : 'text-muted'}`}>
                {assignee ?? '담당자 없음'}
              </span>

              {incident.status === 'OPEN' ? (
                <button
                  type="button"
                  onClick={() => handleAcknowledge(incident)}
                  disabled={pendingId === incident.id}
                  className={`${buttonClass} ${smallButton}`}
                >
                  확인
                </button>
              ) : (
                <StatusBadge tone="ok">확인함</StatusBadge>
              )}

              <button
                type="button"
                onClick={() => onAssignRequest(incident)}
                className={`${incident.status === 'OPEN' ? primaryButtonClass : buttonClass} ${smallButton}`}
              >
                담당자 지정
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Panel
      title="열린 장애"
      className="mb-5"
      action={
        uncheckedCount > 0 && <StatusBadge tone="warn">{uncheckedCount}건 확인 필요</StatusBadge>
      }
    >
      {actionError && (
        <p role="alert" className="border-b border-line2 bg-err-bg px-[18px] py-2.5 text-[13px] text-err">
          {actionError}
        </p>
      )}
      {renderBody()}
    </Panel>
  )
}

export default IncidentList
