import { Check, X } from 'lucide-react'

import CommitLabel from './CommitLabel'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatDayTime, formatDuration } from '../../utils/date'
import { PIPELINE_STAGES, PIPELINE_STATUS } from '../../utils/status'
import type { Pipeline, PipelineStage, PipelineStatus } from '../../types/pipeline'

const dotClass: Record<PipelineStatus, string> = {
  SUCCESS: 'border-ok bg-ok-bg text-ok',
  RUNNING: 'border-info bg-info-bg text-info',
  FAILED: 'border-err bg-err-bg text-err',
  PENDING: 'border-line text-muted',
}

function StageDot({ status }: { status: PipelineStatus }) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${dotClass[status]}`}
    >
      {status === 'SUCCESS' && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
      {status === 'FAILED' && <X size={16} strokeWidth={2.5} aria-hidden="true" />}
      {status === 'RUNNING' && (
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full bg-info animate-pulse motion-reduce:animate-none"
        />
      )}
    </span>
  )
}

function stageTimeLabel(stage: PipelineStage | undefined) {
  if (!stage || stage.status === 'PENDING') return '대기'
  const duration = formatDuration(stage.startedAt, stage.finishedAt)
  return stage.status === 'RUNNING' ? `진행 중 ${duration}` : duration
}

// 설계서 4.7, 9.6: 진행 중(또는 최근) 파이프라인의 5단계와 단계별 소요 시간
function PipelineStrip({
  pipeline,
  isLoading,
  error,
  onRetry,
  isConnected,
}: {
  pipeline: Pipeline | null | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
  isConnected: boolean
}) {
  const runningStage = pipeline?.stages.find((stage) => stage.status === 'RUNNING')
  const runningLabel = PIPELINE_STAGES.find((stage) => stage.name === runningStage?.name)?.runningLabel

  const title = pipeline && isConnected
    ? `${pipeline.status === 'RUNNING' ? '진행 중인' : '최근'} 파이프라인 #${pipeline.number}`
    : '파이프라인'

  const badge = pipeline && isConnected && (
    <StatusBadge tone={PIPELINE_STATUS[pipeline.status].tone}>
      {runningLabel ?? PIPELINE_STATUS[pipeline.status].label}
    </StatusBadge>
  )

  const renderBody = () => {
    if (!isConnected) return <EmptyState message="저장소를 연결하면 확인할 수 있어요." />
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && pipeline === undefined) return <Loading message="파이프라인을 불러오는 중입니다." />
    if (!pipeline) return <EmptyState message="아직 실행된 파이프라인이 없어요." />

    return (
      <>
        <ol className="flex items-start overflow-x-auto px-[18px] pt-[26px] pb-[22px]">
          {PIPELINE_STAGES.map((meta, index) => {
            const stage = pipeline.stages.find((item) => item.name === meta.name)
            const status = stage?.status ?? 'PENDING'
            const isLast = index === PIPELINE_STAGES.length - 1

            return (
              <li key={meta.name} className="contents">
                <div className="flex w-[120px] flex-none flex-col items-center gap-2 text-center">
                  <StageDot status={status} />
                  <b className="font-semibold">{meta.label}</b>
                  <span className="text-[12.5px] text-muted">{stageTimeLabel(stage)}</span>
                </div>
                {!isLast && (
                  <i
                    aria-hidden="true"
                    className={`mt-[18px] h-0.5 min-w-5 flex-1 ${status === 'SUCCESS' ? 'bg-ok' : 'bg-line'}`}
                  />
                )}
              </li>
            )
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-2.5 px-[18px] pb-[18px]">
          <CommitLabel sha={pipeline.commitSha} message={pipeline.commitMessage} />
          <span className="text-muted">{pipeline.branch}</span>
          <span className="text-muted">시작 {formatDayTime(pipeline.startedAt)}</span>
        </div>
      </>
    )
  }

  return (
    <Panel title={title} action={badge} className="mb-5">
      {renderBody()}
    </Panel>
  )
}

export default PipelineStrip
