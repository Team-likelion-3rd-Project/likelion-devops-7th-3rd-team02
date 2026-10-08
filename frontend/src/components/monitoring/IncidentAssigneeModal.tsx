import { useState } from 'react'

import Modal from '../common/Modal'
import { FormError } from '../common/FormField'
import { EmptyState } from '../common/PanelState'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { getErrorMessage } from '../../utils/error'
import type { Incident } from '../../types/incident'
import type { ProjectMember } from '../../types/member'

// 설계서 9.9 장애 담당자 지정 (시안 보드 없음): 프로젝트 팀원 중 한 명을 고른다.
function IncidentAssigneeModal({
  incident,
  members,
  onAssign,
  onClose,
}: {
  incident: Incident
  members: ProjectMember[]
  onAssign: (assigneeId: number) => Promise<void>
  onClose: () => void
}) {
  const [assigneeId, setAssigneeId] = useState<number | null>(incident.assigneeId)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleAssign = async () => {
    if (assigneeId === null || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      await onAssign(assigneeId)
      onClose()
    } catch (error) {
      // 실패하면 기존 상태를 유지하고 메시지를 보여준다 (설계서 5.2).
      setError(getErrorMessage(error, '담당자를 지정하지 못했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="담당자 선택"
      description={incident.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass}>
            취소
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={assigneeId === null || assigneeId === incident.assigneeId || isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? '지정 중...' : '지정'}
          </button>
        </>
      }
    >
      {members.length === 0 ? (
        <EmptyState message="선택할 수 있는 팀원이 없어요." />
      ) : (
        <fieldset className="-mx-2 flex flex-col">
          <legend className="sr-only">담당자</legend>
          {members.map((member) => (
            <label
              key={member.memberId}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-hover"
            >
              <input
                type="radio"
                name="incident-assignee"
                checked={assigneeId === member.userId}
                onChange={() => setAssigneeId(member.userId)}
                className="h-4 w-4 accent-accent"
              />
              {member.name}
            </label>
          ))}
        </fieldset>
      )}
      <FormError message={error} />
    </Modal>
  )
}

export default IncidentAssigneeModal
