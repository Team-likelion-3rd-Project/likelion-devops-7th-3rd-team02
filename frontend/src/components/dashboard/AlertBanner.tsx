import { Link } from 'react-router-dom'

import { focusRing } from '../common/styles'
import { incidentSummary } from '../../utils/monitoring'
import type { Incident } from '../../types/incident'

// 설계서 4.4: 확인되지 않은(OPEN) 장애 건수와 요약. 없으면 표시하지 않는다.
function AlertBanner({
  incidents,
  projectId,
}: {
  incidents: Incident[]
  projectId: number
}) {
  const openIncidents = incidents.filter((incident) => incident.status === 'OPEN')

  if (openIncidents.length === 0) {
    return null
  }

  const first = openIncidents[0]
  const summary = incidentSummary(first)

  return (
    <Link
      to={`/projects/${projectId}/monitoring`}
      className={`mb-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-warn-bg px-3.5 py-[11px] text-[13px] text-warn hover:brightness-[0.98] ${focusRing}`}
    >
      <b className="font-semibold">
        주의가 필요한 항목이 {openIncidents.length}건 있어요.
      </b>
      <span>
        {first.title}
        {summary && ` · ${summary}`} · 모니터링에서 확인하기
      </span>
    </Link>
  )
}

export default AlertBanner
