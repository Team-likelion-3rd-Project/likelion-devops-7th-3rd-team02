import PullRequestBadge from './PullRequestBadge'
import { focusRing } from '../common/styles'
import type { Task } from '../../types/task'

// 설계서 4.5 업무 카드: 제목, 이슈 번호, PR 배지, 담당자 이름
// 이슈·PR 정보는 응답에 있을 때만 표시한다 (6.10 요청 중).
function TaskCard({
  task,
  isSelected,
  onSelect,
}: {
  task: Task
  isSelected: boolean
  onSelect: () => void
}) {
  const assigneeName = task.assigneeName ?? '담당자 없음'
  // 이슈에서 가져온 업무만 PR 상태를 보여준다. 시안: 할 일 카드는 PR이 없으면 배지를 생략한다.
  const showPullRequest =
    task.issue != null &&
    task.pullRequest !== undefined &&
    (task.pullRequest !== null || task.status !== 'TODO')

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      data-task-id={task.id}
      className={`flex w-full min-w-0 cursor-pointer flex-col gap-2 rounded-[10px] border bg-panel px-3.5 py-3 text-left shadow-panel ${focusRing} ${
        isSelected ? 'border-accent ring-1 ring-accent' : 'border-line hover:bg-hover'
      }`}
    >
      <b title={task.title} className="block truncate leading-[1.4] font-semibold">
        {task.title}
      </b>

      <span className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-muted">
        {task.issue && <span className="font-mono">#{task.issue.number}</span>}
        {showPullRequest ? (
          <PullRequestBadge pullRequest={task.pullRequest ?? null} />
        ) : (
          <span>{assigneeName}</span>
        )}
      </span>

      {showPullRequest && (
        <span className="text-[12.5px] text-muted">{assigneeName}</span>
      )}
    </button>
  )
}

export default TaskCard
