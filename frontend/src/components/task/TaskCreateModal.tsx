import { useState } from 'react'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { createTask } from '../../api/taskApi'
import { getErrorMessage } from '../../utils/error'
import type { ProjectMember } from '../../types/member'

// 업무 생성 모달 (설계서 1.2: 2차 유지)
function TaskCreateModal({
  projectId,
  members,
  onCreated,
  onClose,
}: {
  projectId: number
  members: ProjectMember[]
  onCreated: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = title.trim() !== ''

  const handleCreate = async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      await createTask(projectId, {
        title: title.trim(),
        description: description.trim(),
        assigneeId: assigneeId === '' ? null : Number(assigneeId),
      })
      onCreated()
      onClose()
    } catch (error) {
      setError(getErrorMessage(error, '작업 생성에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="새 작업 만들기"
      description="작업의 기본 정보를 입력하세요."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass}>
            취소
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!isFormValid || isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? '생성 중...' : '작업 만들기'}
          </button>
        </>
      }
    >
      <FormField id="task-title" label="작업 제목">
        <input
          id="task-title"
          type="text"
          maxLength={100}
          autoFocus
          placeholder="작업 제목을 입력하세요."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${formControlClass} h-9`}
        />
      </FormField>

      <FormField id="task-description" label="작업 설명">
        <textarea
          id="task-description"
          rows={4}
          maxLength={1000}
          placeholder="작업 설명을 입력하세요."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={`${formControlClass} resize-none py-2.5`}
        />
      </FormField>

      <FormField id="task-assignee" label="담당자">
        <select
          id="task-assignee"
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

      <FormError message={error} />
    </Modal>
  )
}

export default TaskCreateModal
