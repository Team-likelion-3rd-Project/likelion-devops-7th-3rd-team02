import { Link } from 'react-router-dom'

import ListRow from './ListRow'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, textLinkClass } from '../common/styles'
import { formatRelativeTime } from '../../utils/date'
import { DEPLOYMENT_STATUS } from '../../utils/status'
import type { Deployment } from '../../types/deployment'

const RECENT_COUNT = 3

// 설계서 4.4 최근 배포: 이미지 태그, 시각, 상태 (작성자 표시 없음)
function RecentDeployList({
  projectId,
  deployments,
  isLoading,
  error,
  onRetry,
  className = '',
}: {
  projectId: number
  deployments: Deployment[] | null
  isLoading: boolean
  error: string
  onRetry: () => void
  className?: string
}) {
  const cicdPath = `/projects/${projectId}/cicd`

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !deployments) return <Loading message="배포 기록을 불러오는 중입니다." />
    if (!deployments || deployments.length === 0) {
      return (
        <EmptyState
          message="아직 배포 기록이 없어요."
          action={
            <Link to={cicdPath} className={buttonClass}>
              CI/CD 열기
            </Link>
          }
        />
      )
    }

    return (
      <ul>
        {deployments.slice(0, RECENT_COUNT).map((deployment) => (
          <ListRow
            key={deployment.id}
            title={<span className="font-mono text-[12.5px]">{deployment.imageTag}</span>}
            meta={formatRelativeTime(deployment.deployedAt)}
          >
            <StatusBadge tone={DEPLOYMENT_STATUS[deployment.status].tone}>
              {DEPLOYMENT_STATUS[deployment.status].label}
            </StatusBadge>
          </ListRow>
        ))}
      </ul>
    )
  }

  return (
    <Panel
      title="최근 배포"
      className={className}
      action={
        <Link to={cicdPath} className={textLinkClass}>
          CI/CD 열기
        </Link>
      }
    >
      {renderBody()}
    </Panel>
  )
}

export default RecentDeployList
