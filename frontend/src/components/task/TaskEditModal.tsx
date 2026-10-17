import { useState } from 'react'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, dangerButtonClass, primaryButtonClass } from '../common/styles'
import { deleteTask, updateTask, updateTaskAssignee, updateTaskStatus } from '../../api/taskApi'
import { getErrorMessage } from '../../utils/error'
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/status'
import type { ProjectMember } from '../../types/member'
import type { Task, TaskStatus } from '../../types/task'

// 설계서 4.6, 9.4: 제목·내용 수정 + 상태·담당자 변경. 바뀐 항목만 해당 API를 호출한다.
// 삭제(T7)는 OWNER와 그 업무의 담당자에게만 보인다. 확인은 모달 안에서 한 번 더 받는다.
function TaskEditModal({
  projectId,
  task,
  members,
  canDelete,
  onSaved,
  onDeleted,
  onClose,
}: {
  projectId: number
  task: Task
  members: ProjectMember[]
  canDelete: boolean
  onSaved: () => void
  onDeleted: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [assigneeId, setAssigneeId] = useState(
    task.assigneeId === null ? '' : String(task.assigneeId),
  )
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const isFormValid = title.trim() !== ''

  const handleSave = async () => {
    if (!isFormValid || isSubmitting) return

    const nextTitle = title.trim()
    const nextDescription = description.trim()
    const nextAssigneeId = assigneeId === '' ? null : Number(assigneeId)

    const requests: (() => Promise<unknown>)[] = []

    if (nextTitle !== task.title || nextDescription !== (task.description ?? '')) {
      requests.push(() =>
        updateTask(projectId, task.id, { title: nextTitle, description: nextDescription }),
      )
    }
    if (status !== task.status) {
      requests.push(() => updateTaskStatus(projectId, task.id, status))
    }
    // 담당자 없음(null)으로 바꾸면 담당자 해제 (Backend T6)
    if (nextAssigneeId !== task.assigneeId) {
      requests.push(() => updateTaskAssignee(projectId, task.id, nextAssigneeId))
    }

    if (requests.length === 0) {
      onClose()
      return
    }

    setIsSubmitting(true)
    setError('')

    let hasSaved = false

    try {
      for (const request of requests) {
        await request()
        hasSaved = true
      }
      onSaved()
      onClose()
    } catch (error) {
      // 일부만 저장된 경우에도 보드를 다시 조회해 실제 값을 보여준다.
      if (hasSaved) onSaved()
      setError(getErrorMessage(error, '작업 수정에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      await deleteTask(projectId, task.id)
      onDeleted()
      onClose()
    } catch (error) {
      setError(getErrorMessage(error, '업무를 삭제하지 못했습니다.'))
      setIsSubmitting(false)
    }
  }

  // 삭제 확인 중에는 아래 버튼 줄을 확인 문구로 바꾼다 (모달을 겹치지 않게).
  const footer = isConfirmingDelete ? (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <p role="alert" className="mr-auto text-[13px] font-medium text-err">
        이 업무를 삭제할까요? 되돌릴 수 없어요.
      </p>
      <button type="button" onClick={() => setIsConfirmingDelete(false)} className={buttonClass}>
        취소
      </button>
      <button type="button" onClick={handleDelete} disabled={isSubmitting} className={dangerButtonClass}>
        {isSubmitting ? '삭제 중...' : '삭제'}
      </button>
    </div>
  ) : (
    <div className="flex w-full flex-wrap justify-end gap-2">
      {canDelete && (
        <button
          type="button"
          onClick={() => setIsConfirmingDelete(true)}
          disabled={isSubmitting}
          className={`${buttonClass} mr-auto`}
        >
          삭제
        </button>
      )}
      <button type="button" onClick={onClose} className={buttonClass}>
        취소
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={!isFormValid || isSubmitting}
        className={primaryButtonClass}
      >
        {isSubmitting ? '저장 중...' : '저장'}
      </button>
    </div>
  )

  return (
    <Modal title="업무 수정" onClose={onClose} footer={footer}>
      <FormField id="edit-task-title" label="업무 제목">
        <input
          id="edit-task-title"
          type="text"
          maxLength={100}
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${formControlClass} h-9`}
        />
      </FormField>

      <FormField id="edit-task-description" label="업무 내용">
        <textarea
          id="edit-task-description"
          rows={4}
          maxLength={1000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={`${formControlClass} resize-none py-2.5`}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="edit-task-assignee" label="담당자">
          <select
            id="edit-task-assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className={`${formControlClass} h-9`}
          >
            <option value="">담당자 없음</option>
            {members.map((member) => (
              <option key={member.memberId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="edit-task-status" label="상태">
          <select
            id="edit-task-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            className={`${formControlClass} h-9`}
          >
            {TASK_STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {TASK_STATUS[value].label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormError message={error} />
    </Modal>
  )
}

export default TaskEditModal
