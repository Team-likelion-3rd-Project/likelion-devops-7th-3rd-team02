import { useState } from 'react'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { updateTask, updateTaskAssignee, updateTaskStatus } from '../../api/taskApi'
import { getErrorMessage } from '../../utils/error'
import { TASK_STATUS, TASK_STATUS_ORDER } from '../../utils/status'
import type { ProjectMember } from '../../types/member'
import type { Task, TaskStatus } from '../../types/task'

// 설계서 4.6, 9.4: 제목·내용 수정 + 상태·담당자 변경. 바뀐 항목만 해당 API를 호출한다.
// 이슈에서 가져온 업무의 이슈·PR 연결 정보는 수정하지 않는다.
function TaskEditModal({
  projectId,
  task,
  members,
  onSaved,
  onClose,
}: {
  projectId: number
  task: Task
  members: ProjectMember[]
  onSaved: () => void
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
    // 담당자 변경 API는 담당자 ID가 필수라 지정만 할 수 있다 (2차 API).
    if (nextAssigneeId !== null && nextAssigneeId !== task.assigneeId) {
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

  return (
    <Modal
      title="업무 수정"
      onClose={onClose}
      footer={
        <>
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
        </>
      }
    >
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
            <option value="" disabled>
              담당자를 선택하세요
            </option>
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
