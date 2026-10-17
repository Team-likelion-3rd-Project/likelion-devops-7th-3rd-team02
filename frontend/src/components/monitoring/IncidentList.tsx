import { useState } from 'react'

import Modal from '../common/Modal'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { FormError } from '../common/FormField'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, focusRing, primaryButtonClass } from '../common/styles'
import { formatDayTime, formatRelativeTime, formatSince } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import { incidentSummary, isOpenIncident, needsCheck } from '../../utils/monitoring'
import { INCIDENT_SEVERITY, INCIDENT_STATUS } from '../../utils/status'
import type { Incident } from '../../types/incident'
import type { ProjectMember } from '../../types/member'

const smallButton = 'h-7 px-2.5 text-[13px]'

type Tab = 'open' | 'resolved'

// 설계서 4.8 장애 목록: 심각도, 제목, 발생 후 경과, 출처, 담당자, 상태, 확인·담당자 지정
// 확인 버튼은 OPEN 장애에만 활성화하고, 확인 후에도 담당자 지정은 별도로 할 수 있다 (3.7).
// 권한(OWNER 한정 여부)은 확정 전이라 모두에게 표시하고 Backend 403을 오류로 보여준다.
// 탭: 열린 장애(확인 필요·해결 중, 조치 가능) / 최근 해결(I1이 돌려주는 최근 24시간 RESOLVED, 읽기 전용)
// 해결(I6)은 자동 해결보다 먼저 사람이 닫을 때 쓴다. 알림이 아직 울리면 다시 열릴 수 있어 확인을 한 번 받는다.
function IncidentList({
  incidents,
  members,
  isLoading,
  error,
  onRetry,
  onAcknowledge,
  onAssignRequest,
  onResolve,
}: {
  incidents: Incident[] | null
  members: ProjectMember[]
  isLoading: boolean
  error: string
  onRetry: () => void
  onAcknowledge: (incident: Incident) => Promise<void>
  onAssignRequest: (incident: Incident) => void
  onResolve: (incident: Incident) => Promise<void>
}) {
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')
  const [resolving, setResolving] = useState<Incident | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState('')

  // 열린 장애: 해결되지 않은 장애
  const [tab, setTab] = useState<Tab>('open')

  const openIncidents = (incidents ?? []).filter(isOpenIncident)
  const resolvedIncidents = (incidents ?? []).filter((incident) => !isOpenIncident(incident))
  const uncheckedCount = openIncidents.filter(needsCheck).length
  const visibleIncidents = tab === 'open' ? openIncidents : resolvedIncidents

  const TABS: { value: Tab; label: string; count: number }[] = [
    { value: 'open', label: '열린 장애', count: openIncidents.length },
    { value: 'resolved', label: '최근 해결', count: resolvedIncidents.length },
  ]

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

  const handleResolve = async () => {
    if (!resolving) return
    setIsResolving(true)
    setResolveError('')

    try {
      await onResolve(resolving)
      setResolving(null)
    } catch (error) {
      setResolveError(getErrorMessage(error, '장애를 해결 처리하지 못했습니다.'))
    } finally {
      setIsResolving(false)
    }
  }

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !incidents) return <Loading message="장애 목록을 불러오는 중입니다." />
    if (visibleIncidents.length === 0) {
      return (
        <EmptyState
          message={tab === 'open' ? '열린 장애가 없어요.' : '최근 24시간 동안 해결된 장애가 없어요.'}
        />
      )
    }

    return (
      <ul id="incident-tabpanel" role="tabpanel">
        {visibleIncidents.map((incident) => {
          const isResolved = incident.status === 'RESOLVED'
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
                  {isResolved
                    ? `${formatDayTime(incident.occurredAt)} 발생, ${incident.resolvedAt ? `${formatRelativeTime(incident.resolvedAt)} 해결` : '해결됨'}`
                    : formatSince(incident.occurredAt)}
                  , 출처 {incident.source}
                </span>
              </div>

              {/* firing이 false면 알림이 풀린 상태다. 확인한 장애는 30분 뒤 자동으로 해결된다 (Backend). */}
              {!isResolved && incident.firing === false && (
                <StatusBadge tone="muted">현재 안정화됨</StatusBadge>
              )}

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
                <StatusBadge tone={INCIDENT_STATUS[incident.status].tone}>
                  {INCIDENT_STATUS[incident.status].label}
                </StatusBadge>
              )}

              {/* 해결된 장애는 읽기 전용이다. */}
              {!isResolved && (
                <button
                  type="button"
                  onClick={() => onAssignRequest(incident)}
                  className={`${incident.status === 'OPEN' ? primaryButtonClass : buttonClass} ${smallButton}`}
                >
                  담당자 지정
                </button>
              )}

              {!isResolved && (
                <button
                  type="button"
                  onClick={() => {
                    setResolveError('')
                    setResolving(incident)
                  }}
                  className={`${buttonClass} ${smallButton}`}
                >
                  해결
                </button>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Panel
      title="장애"
      className="mb-5"
      action={
        uncheckedCount > 0 && <StatusBadge tone="warn">{uncheckedCount}건 확인 필요</StatusBadge>
      }
    >
      <div role="tablist" aria-label="장애 상태" className="flex gap-1.5 border-b border-line2 px-[18px] py-2.5">
        {TABS.map((item) => {
          const isActive = tab === item.value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls="incident-tabpanel"
              onClick={() => setTab(item.value)}
              className={`flex h-[30px] cursor-pointer items-center rounded-lg border px-2.5 text-[13px] ${focusRing} ${
                isActive
                  ? 'border-transparent bg-accent-bg font-semibold text-accent'
                  : 'border-line font-medium text-muted hover:bg-hover'
              }`}
            >
              {item.label} {item.count}
            </button>
          )
        })}
      </div>

      {actionError && (
        <p role="alert" className="border-b border-line2 bg-err-bg px-[18px] py-2.5 text-[13px] text-err">
          {actionError}
        </p>
      )}
      {renderBody()}

      {resolving && (
        <Modal
          title="장애를 해결로 표시할까요?"
          description={resolving.title}
          onClose={() => setResolving(null)}
          maxWidth="max-w-[460px]"
          footer={
            <>
              <button type="button" onClick={() => setResolving(null)} className={buttonClass}>
                취소
              </button>
              <button type="button" onClick={handleResolve} disabled={isResolving} className={primaryButtonClass}>
                {isResolving ? '처리 중...' : '해결로 표시'}
              </button>
            </>
          }
        >
          <p className="break-keep">
            {resolving.firing === false
              ? '열린 장애에서 빠지고 최근 해결로 옮겨져요.'
              : '알림이 아직 울리는 중이에요. 해결해도 계속 울리면 새 장애로 다시 열려요.'}
          </p>
          <FormError message={resolveError} />
        </Modal>
      )}
    </Panel>
  )
}

export default IncidentList
