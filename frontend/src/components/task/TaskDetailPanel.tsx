import type { ReactNode } from 'react'

import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { buttonClass, focusRing } from '../common/styles'
import { TASK_STATUS } from '../../utils/status'
import type { Task } from '../../types/task'

const linkClass = `font-mono text-[12.5px] text-accent hover:underline ${focusRing}`

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  )
}

// 설계서 4.5 오른쪽 상세 패널: 제목, 상태, 설명, 담당자, GitHub 이슈, PR 링크, 수정 버튼
// 삭제 버튼과 상태 변경 이력은 표시하지 않는다.
function TaskDetailPanel({
  task,
  onEdit,
}: {
  task: Task
  onEdit: () => void
}) {
  return (
    <Panel
      title={<span className="break-keep">{task.title}</span>}
      action={
        <StatusBadge tone={TASK_STATUS[task.status].tone}>
          {TASK_STATUS[task.status].label}
        </StatusBadge>
      }
    >
      <div className="flex flex-col gap-[18px] px-[18px] py-4">
        {task.description && (
          <p className="break-keep whitespace-pre-line">{task.description}</p>
        )}

        <div className="flex flex-col gap-2">
          <DetailRow label="담당자">{task.assigneeName ?? '담당자 없음'}</DetailRow>

          {task.issue && (
            <DetailRow label="GitHub 이슈">
              <a href={task.issue.url} target="_blank" rel="noreferrer" className={linkClass}>
                #{task.issue.number}
              </a>
            </DetailRow>
          )}

          {task.pullRequest && (
            <DetailRow label="Pull Request">
              <a
                href={task.pullRequest.url}
                target="_blank"
                rel="noreferrer"
                className={linkClass}
              >
                #{task.pullRequest.number} GitHub에서 보기
              </a>
            </DetailRow>
          )}
        </div>

        <button type="button" onClick={onEdit} className={`${buttonClass} w-full`}>
          수정
        </button>
      </div>
    </Panel>
  )
}

export default TaskDetailPanel
