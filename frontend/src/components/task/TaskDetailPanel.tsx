import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { buttonClass, focusRing } from '../common/styles'
import { TASK_STATUS } from '../../utils/status'
import type { Task } from '../../types/task'

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  )
}

// 설계서 4.5 오른쪽 상세 패널: 제목, 상태, 설명, 담당자, 수정 버튼
// 삭제 버튼과 상태 변경 이력은 표시하지 않는다. 닫기(X), Esc, 같은 카드 다시 선택으로 닫는다.
function TaskDetailPanel({
  task,
  onEdit,
  onClose,
}: {
  task: Task
  onEdit: () => void
  onClose: () => void
}) {
  return (
    <Panel
      title={<span className="break-keep [overflow-wrap:anywhere]">{task.title}</span>}
      action={
        <span className="flex flex-none items-center gap-1.5">
          <StatusBadge tone={TASK_STATUS[task.status].tone}>
            {TASK_STATUS[task.status].label}
          </StatusBadge>
          <button
            type="button"
            onClick={onClose}
            aria-label="상세 닫기"
            title="닫기 (Esc)"
            className={`-mr-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink ${focusRing}`}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </span>
      }
    >
      <div className="flex flex-col gap-[18px] px-[18px] py-4">
        {task.description && (
          <p className="break-keep whitespace-pre-line [overflow-wrap:anywhere]">{task.description}</p>
        )}

        <div className="flex flex-col gap-2">
          <DetailRow label="담당자">{task.assigneeName ?? '담당자 없음'}</DetailRow>
        </div>

        <button type="button" onClick={onEdit} className={`${buttonClass} w-full`}>
          수정
        </button>
      </div>
    </Panel>
  )
}

export default TaskDetailPanel
