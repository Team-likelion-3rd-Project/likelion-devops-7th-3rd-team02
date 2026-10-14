import TaskCard from './TaskCard'
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/status'
import type { Task, TaskStatus } from '../../types/task'

// 설계서 4.5: 할 일 / 진행 중 / 완료 3열 (드래그 앤 드롭 없음)
// 컬럼 건수는 응답의 statusCounts(상태별 전체 건수)를 쓴다. 이전 응답(Task[])이면 현재 페이지 건수를 보여준다.
function TaskBoard({
  tasks,
  statusCounts,
  selectedTaskId,
  onSelect,
}: {
  tasks: Task[]
  statusCounts?: Record<TaskStatus, number>
  selectedTaskId: number | null
  onSelect: (taskId: number) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3.5 max-[1200px]:grid-cols-1">
      {TASK_STATUS_ORDER.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status)

        return (
          <section key={status} aria-label={TASK_STATUS[status].label}>
            <h3 className="mb-2.5 flex justify-between text-[13.5px] font-semibold text-muted">
              {TASK_STATUS[status].label}
              <span>{statusCounts?.[status] ?? columnTasks.length}</span>
            </h3>

            <ul className="flex flex-col gap-2.5">
              {columnTasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    isSelected={task.id === selectedTaskId}
                    onSelect={() => onSelect(task.id)}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export default TaskBoard
