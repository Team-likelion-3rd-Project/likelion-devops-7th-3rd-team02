import HistoryTable from './HistoryTable'
import type { HistoryColumn } from './HistoryTable'
import StatusBadge from '../common/StatusBadge'
import { formatDayTime, formatDuration, shortSha } from '../../utils/date'
import { PIPELINE_STAGES, PIPELINE_STATUS } from '../../utils/status'
import type { Pipeline } from '../../types/pipeline'

const mono = 'font-mono text-[12.5px]'

// 실패한 단계는 상태에 "실패 (Test)"처럼 단계명을 함께 표시한다 (설계서 4.7).
function statusLabel(pipeline: Pipeline) {
  const label = PIPELINE_STATUS[pipeline.status].label
  if (pipeline.status !== 'FAILED') return label

  const failed = pipeline.stages.find((stage) => stage.status === 'FAILED')
  const stageLabel = PIPELINE_STAGES.find((stage) => stage.name === failed?.name)?.label
  return stageLabel ? `${label} (${stageLabel})` : label
}

const COLUMNS: HistoryColumn<Pipeline>[] = [
  { header: '번호', render: (row) => `#${row.number}` },
  { header: '브랜치', render: (row) => row.branch, className: mono },
  { header: '커밋', render: (row) => shortSha(row.commitSha), className: mono },
  {
    header: '상태',
    render: (row) => (
      <StatusBadge tone={PIPELINE_STATUS[row.status].tone}>{statusLabel(row)}</StatusBadge>
    ),
  },
  { header: '시작', render: (row) => formatDayTime(row.startedAt) },
  {
    header: '소요 시간',
    render: (row) =>
      row.finishedAt ? formatDuration(row.startedAt, row.finishedAt) : <span className="text-muted">-</span>,
  },
]

type PipelineTableProps = Omit<
  Parameters<typeof HistoryTable<Pipeline>>[0],
  'title' | 'columns' | 'emptyMessage' | 'loadingMessage'
>

function PipelineTable(props: PipelineTableProps) {
  return (
    <HistoryTable<Pipeline>
      title="파이프라인 이력"
      columns={COLUMNS}
      emptyMessage="아직 실행된 파이프라인이 없어요."
      loadingMessage="파이프라인을 불러오는 중입니다."
      {...props}
    />
  )
}

export default PipelineTable
