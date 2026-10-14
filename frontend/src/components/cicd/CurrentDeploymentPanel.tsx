import CommitLabel from './CommitLabel'
import KeyValueList from '../common/KeyValueList'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatClock, formatRelativeTime } from '../../utils/date'
import { CURRENT_DEPLOYMENT_STATUS, DEPLOYMENT_STATUS, HEALTH_STATUS } from '../../utils/status'
import type { Deployment } from '../../types/deployment'

// 설계서 4.7 현재 배포: 이미지 태그, 리비전, 환경, 커밋, 배포 시각, 상태 (배포 목록의 최신 항목)
// 상태 배지는 실행 중인 애플리케이션 상태(health)를 우선 쓰고, 없으면 배포 결과를 보여준다.
function CurrentDeploymentPanel({
  deployment,
  isLoading,
  error,
  onRetry,
  isConnected,
}: {
  deployment: Deployment | null | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
  isConnected: boolean
}) {
  const status = deployment
    ? deployment.health
      ? HEALTH_STATUS[deployment.health]
      : CURRENT_DEPLOYMENT_STATUS[deployment.status]
    : null

  const renderBody = () => {
    if (!isConnected) return <EmptyState message="저장소를 연결하면 확인할 수 있어요." />
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && deployment === undefined) return <Loading message="배포 정보를 불러오는 중입니다." />
    if (!deployment) return <EmptyState message="아직 배포 기록이 없어요." />

    return (
      <div className="px-[18px] py-4">
        <KeyValueList
          items={[
            { label: '이미지 태그', value: <span className="font-mono text-[12.5px]">{deployment.imageTag}</span> },
            { label: '리비전', value: <span className="font-mono text-[12.5px]">{deployment.revision}</span> },
            { label: '환경', value: deployment.environment },
            { label: '커밋', value: <CommitLabel sha={deployment.commitSha} message={deployment.commitMessage} /> },
            // health가 배지에 나갈 때 최신 배포가 실패·진행 중이면 결과를 따로 알린다.
            ...(deployment.health && deployment.status !== 'SUCCESS'
              ? [{ label: '배포 결과', value: <StatusBadge tone={DEPLOYMENT_STATUS[deployment.status].tone}>{DEPLOYMENT_STATUS[deployment.status].label}</StatusBadge> }]
              : []),
            {
              label: '배포 시각',
              value: `${formatRelativeTime(deployment.deployedAt)} (${formatClock(deployment.deployedAt).slice(0, 5)})`,
            },
          ]}
        />
      </div>
    )
  }

  return (
    <Panel
      title="현재 배포"
      action={status && isConnected && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
    >
      {renderBody()}
    </Panel>
  )
}

export default CurrentDeploymentPanel
