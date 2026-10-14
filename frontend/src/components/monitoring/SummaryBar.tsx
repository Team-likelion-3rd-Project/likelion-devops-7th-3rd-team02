import type { ReactNode } from 'react'

import { ErrorMessage, Loading } from '../common/PanelState'
import { formatMetric, RANGE_LABEL, RANGE_MINUTES } from '../../utils/monitoring'
import type { MonitoringRange, MonitoringSummary } from '../../types/monitoring'

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`

function Metric({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div className="border-r border-line2 px-[18px] py-4 last:border-r-0 max-[1100px]:[&:nth-child(2)]:border-r-0">
      <span className="text-[12.5px] text-muted">{label}</span>
      <b className="mt-0.5 block text-[22px] font-semibold tracking-[-0.01em]">{value}</b>
      <span className="text-[12.5px]">{note ?? ' '}</span>
    </div>
  )
}

// 설계서 4.8 요약 지표: HTTP 요청 수, 오류율, 평균 응답 시간, 레플리카 (지표 기준선 없음)
function SummaryBar({
  summary,
  range,
  isLoading,
  error,
  onRetry,
}: {
  summary: MonitoringSummary | null
  range: MonitoringRange
  isLoading: boolean
  error: string
  onRetry: () => void
}) {
  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !summary) return <Loading message="모니터링 데이터를 불러오는 중입니다." />
    if (!summary) return null

    const { ready, desired } = summary.replicas
    const perMinute = Math.round(summary.httpRequestCount / RANGE_MINUTES[range])

    return (
      <div className="grid grid-cols-4 max-[1100px]:grid-cols-2">
        <Metric
          label={`HTTP 요청 수 (${RANGE_LABEL[range]})`}
          value={summary.httpRequestCount.toLocaleString('ko-KR')}
          note={<span className="text-muted">분당 평균 {perMinute.toLocaleString('ko-KR')}</span>}
        />
        <Metric label="오류율" value={`${formatMetric(summary.errorRate)}%`} />
        <Metric label="평균 응답 시간" value={formatSeconds(summary.avgResponseTimeMs)} />
        <Metric
          label="레플리카"
          value={`${ready} / ${desired}`}
          note={ready === desired && <span className="text-ok">모두 준비됨</span>}
        />
      </div>
    )
  }

  return (
    <section
      aria-label="요약 지표"
      className={`mb-5 overflow-hidden rounded-xl border border-line bg-panel shadow-panel ${
        isLoading && summary ? 'opacity-60' : ''
      }`}
    >
      {renderBody()}
    </section>
  )
}

export default SummaryBar
