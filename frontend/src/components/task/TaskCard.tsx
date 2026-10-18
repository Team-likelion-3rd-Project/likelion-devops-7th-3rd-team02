import { focusRing } from '../common/styles'
import type { Task } from '../../types/task'

// 설계서 4.5 업무 카드: 제목, 담당자 이름 (GitHub 이슈·PR 연동은 3차 범위에서 제외)
// 로그인한 사람이 담당자인 카드는 왼쪽 막대로 표시해 보드에서 내 일을 바로 찾게 한다.
function TaskCard({
  task,
  isMine,
  isSelected,
  onSelect,
}: {
  task: Task
  isMine: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      data-task-id={task.id}
      className={`relative flex w-full min-w-0 cursor-pointer flex-col gap-2 overflow-hidden rounded-[10px] border bg-panel px-3.5 py-3 text-left shadow-panel ${focusRing} ${
        isSelected ? 'border-accent ring-1 ring-accent' : 'border-line hover:bg-hover'
      } ${isMine ? 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-accent' : ''}`}
    >
      {isMine && <span className="sr-only">내 작업,</span>}
      <b title={task.title} className="block truncate leading-[1.4] font-semibold">
        {task.title}
      </b>

      <span className="truncate text-[12.5px] text-muted">{task.assigneeName ?? '담당자 없음'}</span>
    </button>
  )
}

export default TaskCard
