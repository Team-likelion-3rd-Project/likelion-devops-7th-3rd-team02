import KeyValueList from '../common/KeyValueList'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatClock, formatRelativeTime, shortSha } from '../../utils/date'
import { CURRENT_DEPLOYMENT_STATUS } from '../../utils/status'
import type { Deployment } from '../../types/deployment'

// 설계서 4.7 현재 배포: 이미지 태그, 리비전, 환경, 커밋, 배포 시각, 상태 (배포 목록의 최신 항목)
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
  const status = deployment ? CURRENT_DEPLOYMENT_STATUS[deployment.status] : null

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
            // 커밋 메시지는 응답에 포함될 때만 표시한다 (설계서 4.7, 10.2). 배포 응답에는 아직 없다.
            { label: '커밋', value: <span className="font-mono text-[12.5px]">{shortSha(deployment.commitSha)}</span> },
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
