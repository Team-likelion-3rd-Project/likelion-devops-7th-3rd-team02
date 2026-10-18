import TaskCard from './TaskCard'
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/status'
import type { Task, TaskStatus } from '../../types/task'

// 빈 열에 무엇이 들어오는지 알려 준다.
const EMPTY_MESSAGE: Record<TaskStatus, string> = {
  TODO: '할 일이 없어요.',
  IN_PROGRESS: '진행 중인 작업이 없어요.',
  DONE: '완료한 작업이 여기에 쌓여요.',
}

// 설계서 4.5: 할 일 / 진행 중 / 완료 3열 (드래그 앤 드롭 없음)
// 컬럼 건수는 응답의 statusCounts(상태별 전체 건수)를 쓴다. 이전 응답(Task[])이면 현재 페이지 건수를 보여준다.
// 열마다 옅은 바닥을 깔아 카드가 없어도 열의 자리가 보이게 한다.
function TaskBoard({
  tasks,
  statusCounts,
  selectedTaskId,
  currentUserId,
  onSelect,
}: {
  tasks: Task[]
  statusCounts?: Record<TaskStatus, number>
  selectedTaskId: number | null
  currentUserId: number | undefined
  onSelect: (taskId: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3.5 max-[1200px]:grid-cols-1">
      {TASK_STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status)
        const totalCount = statusCounts?.[status] ?? columnTasks.length

        return (
          <section
            key={status}
            aria-label={TASK_STATUS[status].label}
            className="flex flex-col rounded-xl bg-line2/50 p-2.5 dark:bg-chrome"
          >
            <h3 className="mb-2.5 flex justify-between px-1 text-[13.5px] font-semibold text-muted">
              {TASK_STATUS[status].label}
              <span>{totalCount}</span>
            </h3>

            {columnTasks.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <TaskCard
                      task={task}
                      isMine={currentUserId !== undefined && task.assigneeId === currentUserId}
                      isSelected={task.id === selectedTaskId}
                      onSelect={() => onSelect(task.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              // 다른 페이지에만 있는 경우는 "없다"고 하지 않는다.
              <p className="rounded-[10px] border border-dashed border-line px-3.5 py-5 text-center text-[13px] text-muted">
                {totalCount > 0 ? '이 페이지에는 없어요.' : EMPTY_MESSAGE[status]}
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default TaskBoard
