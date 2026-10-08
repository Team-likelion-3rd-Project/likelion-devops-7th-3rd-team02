import StatusBadge from '../common/StatusBadge'
import { PULL_REQUEST_STATUS } from '../../utils/status'
import type { TaskPullRequestLink } from '../../types/task'

// 시안: "PR #61 리뷰 중", 연결된 PR이 없으면 "PR 없음"
function PullRequestBadge({
  pullRequest,
}: {
  pullRequest: TaskPullRequestLink | null
}) {
  if (!pullRequest) {
    return (
      <StatusBadge tone="muted" plain>
        PR 없음
      </StatusBadge>
    )
  }

  const meta = PULL_REQUEST_STATUS[pullRequest.status]

  return (
    <StatusBadge tone={meta.tone}>
      PR #{pullRequest.number} {meta.label}
    </StatusBadge>
  )
}

export default PullRequestBadge
