import { useState } from 'react'
import { Link } from 'react-router-dom'

import Panel from '../components/common/Panel'
import StatusBadge from '../components/common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../components/common/PanelState'
import { focusRing, textLinkClass } from '../components/common/styles'
import { getMyIncidents } from '../api/incidentApi'
import { useAsyncData } from '../hooks/useAsyncData'
import { useIncidentContext } from '../hooks/useIncidentContext'
import { formatDayTime, formatRelativeTime, formatSince } from '../utils/date'
import { incidentSummary } from '../utils/monitoring'
import { INCIDENT_SEVERITY, INCIDENT_STATUS } from '../utils/status'
import type { Incident } from '../types/incident'

// 상태 흐름 순서로 겹치지 않게 나눈다: 확인 필요(OPEN) → 해결 중(ACKNOWLEDGED) → 최근 해결(RESOLVED)
// 기본은 확인 필요라서 사이드바 배지 숫자와 처음 보이는 건수가 같다.
type Filter = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'OPEN', label: '확인 필요' },
  { value: 'ACKNOWLEDGED', label: '해결 중' },
  // 해결된 장애는 API가 최근 24시간만 돌려준다 (I7 status=RESOLVED)
  { value: 'RESOLVED', label: '최근 해결 (24시간)' },
]

const EMPTY_MESSAGE: Record<Filter, string> = {
  OPEN: '확인이 필요한 장애가 없어요.',
  ACKNOWLEDGED: '해결 중인 장애가 없어요.',
  RESOLVED: '최근 24시간 동안 해결된 장애가 없어요.',
}

// 응답 순서(발생 최신순)를 지키며 프로젝트별로 묶는다.
const groupByProject = (incidents: Incident[]) => {
  const groups = new Map<number, { projectName: string; incidents: Incident[] }>()
  incidents.forEach((incident) => {
    const group = groups.get(incident.projectId) ?? { projectName: incident.projectName, incidents: [] }
    group.incidents.push(incident)
    groups.set(incident.projectId, group)
  })
  return [...groups.entries()]
}

// 설계서 4.11 전체 장애: 내가 팀원인 모든 프로젝트의 해결 안 된 장애(또는 최근 24시간 해결된 장애)를 프로젝트별로 본다.
// 읽기 전용이다. 장애를 누르면 그 프로젝트의 모니터링으로 이동하고, 확인·담당자 지정은 거기서 한다.
function IncidentsPage() {
  const open = useIncidentContext()
  const [filter, setFilter] = useState<Filter>('OPEN')

  // 최근 해결은 고를 때만 따로 불러온다.
  const resolved = useAsyncData(
    () => getMyIncidents(['RESOLVED']).then((response) => response.data.data),
    filter === 'RESOLVED' ? 'my-incidents-resolved' : null,
    '해결된 장애를 불러오지 못했습니다.',
  )

  const isResolvedView = filter === 'RESOLVED'
  const source = isResolvedView ? resolved : open

  const incidents = (source.data?.incidents ?? []).filter((incident) => incident.status === filter)

  // 칩 건수: 확인 필요는 openCount(배지와 같은 값), 해결 중은 목록에서 센다.
  const counts: Partial<Record<Filter, number>> = open.data
    ? {
        OPEN: open.data.openCount,
        ACKNOWLEDGED: open.data.incidents.filter((incident) => incident.status === 'ACKNOWLEDGED').length,
      }
    : {}

  const renderBody = () => {
    if (source.error && !source.data) return <ErrorMessage message={source.error} onRetry={source.reload} />
    if (source.isLoading && !source.data) return <Loading message="장애를 불러오는 중입니다." />
    if (incidents.length === 0) return <EmptyState message={EMPTY_MESSAGE[filter]} />

    return (
      <div className="flex flex-col gap-5">
        {groupByProject(incidents).map(([projectId, group]) => (
          <Panel
            key={projectId}
            title={
              <span title={group.projectName} className="block truncate">
                {group.projectName} <span className="font-normal text-muted">{group.incidents.length}건</span>
              </span>
            }
            action={
              <Link to={`/projects/${projectId}/monitoring`} className={`flex-none ${textLinkClass}`}>
                모니터링 열기
              </Link>
            }
          >
            <ul>
              {group.incidents.map((incident) => {
                const severity = INCIDENT_SEVERITY[incident.severity]
                const summary = incidentSummary(incident)

                return (
                  <li key={incident.id} className="border-b border-line2 last:border-b-0">
                    <Link
                      to={`/projects/${projectId}/monitoring`}
                      className={`flex flex-wrap items-center gap-3.5 px-[18px] py-3.5 hover:bg-hover ${focusRing}`}
                    >
                      <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate font-semibold" title={incident.title}>
                          {incident.title}
                        </b>
                        {summary && <span className="block text-[13px]">{summary}</span>}
                        <span className="text-[12.5px] text-muted">
                          {isResolvedView
                            ? `${formatDayTime(incident.occurredAt)} 발생, ${incident.resolvedAt ? `${formatRelativeTime(incident.resolvedAt)} 해결` : '해결됨'}`
                            : formatSince(incident.occurredAt)}
                          , 출처 {incident.source}
                        </span>
                      </span>
                      {!isResolvedView && incident.firing === false && (
                        <StatusBadge tone="muted">현재 안정화됨</StatusBadge>
                      )}
                      <span className={`text-[12.5px] ${incident.assigneeId === null ? 'text-muted' : ''}`}>
                        {incident.assigneeId === null ? '담당자 없음' : '담당자 지정됨'}
                      </span>
                      <StatusBadge tone={INCIDENT_STATUS[incident.status].tone}>
                        {INCIDENT_STATUS[incident.status].label}
                      </StatusBadge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">전체 장애</h1>
          <p className="mt-1 text-[13px] text-muted">
            참여 중인 모든 프로젝트의 장애예요. 확인과 담당자 지정은 각 프로젝트의 모니터링에서 해요.
          </p>
        </div>

        <div role="group" aria-label="장애 상태" className="flex gap-1.5">
          {FILTERS.map((item) => {
            const isActive = filter === item.value
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter(item.value)}
                className={`flex h-[34px] cursor-pointer items-center rounded-lg border px-3 ${focusRing} ${
                  isActive
                    ? 'border-transparent bg-accent-bg font-semibold text-accent'
                    : 'border-line font-medium text-muted hover:bg-hover'
                }`}
              >
                {item.label}
                {counts[item.value] !== undefined && ` ${counts[item.value]}`}
              </button>
            )
          })}
        </div>
      </div>

      {renderBody()}
    </>
  )
}

export default IncidentsPage
