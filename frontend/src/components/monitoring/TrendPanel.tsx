import TrendChart from './TrendChart'
import Panel from '../common/Panel'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { RANGE_LABEL } from '../../utils/monitoring'
import type { MetricPoint, MonitoringRange } from '../../types/monitoring'

const pad = (value: number) => String(value).padStart(2, '0')

// 축 라벨 4개: 처음, 1/3, 2/3, 마지막 시각
const timeLabels = (series: MetricPoint[]) => {
  if (series.length === 0) return []
  const last = series.length - 1
  return [0, Math.round(last / 3), Math.round((last * 2) / 3), last].map((index) => {
    const date = new Date(series[index].timestamp)
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  })
}

const latest = (values: number[]) => values[values.length - 1] ?? 0

// 설계서 4.8 추이: 오류율, 응답 시간, CPU와 메모리 3종 (요청 수 추이·기준선 없음)
function TrendPanel({
  series,
  range,
  isLoading,
  error,
  onRetry,
}: {
  series: MetricPoint[] | null
  range: MonitoringRange
  isLoading: boolean
  error: string
  onRetry: () => void
}) {
  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !series) return <Loading message="모니터링 데이터를 불러오는 중입니다." />
    if (!series || series.length === 0) {
      return (
        <EmptyState
          message="수집된 지표가 없어요."
          action={
            <button type="button" onClick={onRetry} className="text-[13px] text-accent hover:underline">
              다시 확인
            </button>
          }
        />
      )
    }

    const labels = timeLabels(series)
    const errorRates = series.map((point) => point.errorRate)
    const responseTimes = series.map((point) => point.responseTimeMs)
    const cpu = series.map((point) => point.cpuUsage)
    const memory = series.map((point) => point.memoryUsage)

    return (
      // 기간 변경 중에는 차트 영역에 로딩을 표시한다 (설계서 5.1).
      <div className="relative">
        <div
          className={`grid grid-cols-3 max-[1100px]:grid-cols-1 [&>div]:border-r [&>div]:border-line2 [&>div:last-child]:border-r-0 max-[1100px]:[&>div]:border-r-0 ${
            isLoading ? 'opacity-40' : ''
          }`}
        >
          <TrendChart
            title="오류율"
            unit="%"
            series={[{ label: '오류율', values: errorRates, strokeClass: 'stroke-accent', fillClass: 'fill-accent' }]}
            timeLabels={labels}
            summary={`오류율 최근 ${latest(errorRates)}%`}
          />
          <TrendChart
            title="응답 시간"
            unit="ms"
            series={[{ label: '응답 시간', values: responseTimes, strokeClass: 'stroke-accent', fillClass: 'fill-accent' }]}
            timeLabels={labels}
            summary={`응답 시간 최근 ${latest(responseTimes)}ms`}
          />
          <TrendChart
            title="CPU와 메모리"
            unit="파랑 CPU, 보라 메모리 (%)"
            series={[
              { label: 'CPU', values: cpu, strokeClass: 'stroke-accent', fillClass: 'fill-accent' },
              { label: '메모리', values: memory, strokeClass: 'stroke-merged' },
            ]}
            timeLabels={labels}
            yMax={100}
            summary={`CPU 최근 ${latest(cpu)}%, 메모리 최근 ${latest(memory)}%`}
          />
        </div>
        {isLoading && (
          <p role="status" className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
            모니터링 데이터를 불러오는 중입니다.
          </p>
        )}
      </div>
    )
  }

  return (
    <Panel
      title="추이"
      className="mb-5"
      action={<small className="text-[12px] text-muted">지난 {RANGE_LABEL[range]}</small>}
    >
      {renderBody()}
    </Panel>
  )
}

export default TrendPanel
