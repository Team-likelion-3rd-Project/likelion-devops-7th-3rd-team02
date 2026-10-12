import { fieldClass, focusRing } from '../common/styles'
import { TASK_SORT_OPTIONS } from '../../hooks/useProjectTasks'
import type { TaskFilters } from '../../hooks/useProjectTasks'
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/status'
import type { ProjectMember } from '../../types/member'
import type { TaskStatus } from '../../types/task'

const STATUS_CHIPS: { value: TaskStatus | null; label: string }[] = [
  { value: null, label: '전체' },
  ...TASK_STATUS_ORDER.map((status) => ({
    value: status,
    label: TASK_STATUS[status].label,
  })),
]

// 설계서 4.5: 제목 검색, 상태 칩, 담당자 선택(userId), 정렬
function TaskFilterBar({
  filters,
  members,
  onChange,
}: {
  filters: TaskFilters
  members: ProjectMember[]
  onChange: (next: Partial<TaskFilters>) => void
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <input
        type="search"
        aria-label="제목 검색"
        placeholder="제목 검색"
        value={filters.keyword}
        onChange={(event) => onChange({ keyword: event.target.value })}
        className={`${fieldClass} w-[260px]`}
      />

      <div role="group" aria-label="상태" className="flex gap-1.5">
        {STATUS_CHIPS.map((chip) => {
          const isActive = filters.status === chip.value

          return (
            <button
              key={chip.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange({ status: chip.value })}
              className={`flex h-[34px] cursor-pointer items-center rounded-lg border px-3 ${focusRing} ${
                isActive
                  ? 'border-transparent bg-accent-bg font-semibold text-accent'
                  : 'border-line font-medium text-muted hover:bg-hover'
              }`}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <select
        aria-label="담당자"
        value={filters.assigneeId ?? ''}
        onChange={(event) =>
          onChange({
            assigneeId: event.target.value === '' ? null : Number(event.target.value),
          })
        }
        className={fieldClass}
      >
        <option value="">담당자: 전체</option>
        {members.map((member) => (
          <option key={member.memberId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>

      <select
        aria-label="정렬"
        value={filters.sort}
        onChange={(event) => onChange({ sort: event.target.value })}
        className={fieldClass}
      >
        {TASK_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default TaskFilterBar
