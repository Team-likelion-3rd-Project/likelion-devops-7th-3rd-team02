import type { ReactNode } from 'react'

import CommitLabel from './CommitLabel'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatClock, formatRelativeTime } from '../../utils/date'
import { CURRENT_DEPLOYMENT_STATUS, DEPLOYMENT_STATUS, HEALTH_STATUS } from '../../utils/status'
import type { Deployment } from '../../types/deployment'

const mono = 'font-mono text-[12.5px]'

// 띠의 한 칸: 라벨 위, 값 아래. 값은 한 줄로 말줄임한다.
function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${wide ? 'col-span-2' : ''}`}>
      <dt className="text-[12.5px] text-muted">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}

// 설계서 4.7 현재 배포: 이미지 태그, 리비전, 환경, 커밋, 배포 시각, 상태 (배포 목록의 최신 항목)
// 아래 파이프라인 띠와 같은 폭으로 놓아, 지금 실행 중인 것과 지금 만드는 것을 위아래로 비교하게 한다.
// 상태 배지는 실행 중인 애플리케이션 상태(health)를 우선 쓰고, 없으면 배포 결과를 보여준다.
function CurrentDeploymentPanel({
  deployment,
  isLoading,
  error,
  onRetry,
  emptyAction,
}: {
  deployment: Deployment | null | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
  // 배포 기록이 없을 때 다음 할 일 (OWNER: 설정에서 배포 기록 연결)
  emptyAction?: ReactNode
}) {
  const status = deployment
    ? deployment.health
      ? HEALTH_STATUS[deployment.health]
      : CURRENT_DEPLOYMENT_STATUS[deployment.status]
    : null

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && deployment === undefined) return <Loading message="배포 정보를 불러오는 중입니다." />
    // 배포 기록은 저장소와 무관하게 CI가 Webhook(D3)으로 보낸다.
    if (!deployment) {
      return <EmptyState message="아직 배포 기록이 없어요. CI가 배포를 알려 주면 여기에 보여요." action={emptyAction} />
    }

    const deployedAt = `${formatRelativeTime(deployment.deployedAt)} (${formatClock(deployment.deployedAt).slice(0, 5)})`
    // health가 배지에 나갈 때 최신 배포가 실패·진행 중이면 결과를 따로 알린다.
    const showResult = deployment.health && deployment.status !== 'SUCCESS'

    return (
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-x-6 gap-y-3.5 px-[18px] py-4">
        <Field label="이미지 태그">
          <span title={deployment.imageTag} className={mono}>
            {deployment.imageTag}
          </span>
        </Field>
        <Field label="리비전">
          <span className={mono}>{deployment.revision}</span>
        </Field>
        <Field label="환경">
          <span title={deployment.environment}>{deployment.environment}</span>
        </Field>
        <Field label="배포 시각">{deployedAt}</Field>
        {showResult && (
          <Field label="배포 결과">
            <StatusBadge tone={DEPLOYMENT_STATUS[deployment.status].tone}>
              {DEPLOYMENT_STATUS[deployment.status].label}
            </StatusBadge>
          </Field>
        )}
        {/* 가장 긴 값이라 두 칸을 쓰고 맨 뒤에 둔다 (좁은 화면에서 빈 칸이 생기지 않게). */}
        <Field label="커밋" wide>
          <CommitLabel sha={deployment.commitSha} message={deployment.commitMessage} />
        </Field>
      </dl>
    )
  }

  return (
    <Panel
      title="현재 배포"
      className="mb-5"
      action={status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
    >
      {renderBody()}
    </Panel>
  )
}

export default CurrentDeploymentPanel
