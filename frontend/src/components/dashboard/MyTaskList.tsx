import { Link } from 'react-router-dom'

import ListRow from './ListRow'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, textLinkClass } from '../common/styles'
import { TASK_STATUS } from '../../utils/status'
import type { Task } from '../../types/task'

// 설계서 4.4 내 작업: 제목, 이슈 번호, PR 상태, 상태
// 이슈 번호·PR 상태는 업무 응답에 포함 요청 중 (6.10)이라 응답에 생기면 표시한다.
function MyTaskList({
  projectId,
  tasks,
  isLoading,
  error,
  onRetry,
  className = '',
}: {
  projectId: number
  tasks: Task[] | null
  isLoading: boolean
  error: string
  onRetry: () => void
  className?: string
}) {
  const taskBoardPath = `/projects/${projectId}/tasks`

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !tasks) return <Loading message="업무를 불러오는 중입니다." />
    if (!tasks || tasks.length === 0) {
      return (
        <EmptyState
          message="나에게 할당된 업무가 없어요."
          action={
            <Link to={taskBoardPath} className={buttonClass}>
              작업 보드 열기
            </Link>
          }
        />
      )
    }

    return (
      <ul>
        {tasks.map((task) => (
          <ListRow key={task.id} title={task.title}>
            <StatusBadge tone={TASK_STATUS[task.status].tone}>
              {TASK_STATUS[task.status].label}
            </StatusBadge>
          </ListRow>
        ))}
      </ul>
    )
  }

  return (
    <Panel
      title="내 작업"
      className={className}
      action={
        <Link to={taskBoardPath} className={textLinkClass}>
          작업 보드 열기
        </Link>
      }
    >
      {renderBody()}
    </Panel>
  )
}

export default MyTaskList
