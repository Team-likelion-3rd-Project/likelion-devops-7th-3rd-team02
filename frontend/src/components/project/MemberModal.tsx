import { useState } from 'react'

import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { addMember } from '../../api/memberApi'
import { useProjectMembers } from '../../hooks/useProjectMembers'
import { getErrorMessage } from '../../utils/error'
import { PROJECT_ROLE_LABEL } from '../../utils/projectRole'
import type { ProjectListItem } from '../../types/project'

// 팀원 목록과 역할 표시, OWNER의 팀원 등록 (설계서 1.2: 2차 유지)
// 3차 위치: Sidebar 프로젝트 박스에서 연다 (설계서 10.4 결정 2026-10-08).
function MemberModal({
  project,
  isOwner,
  onClose,
}: {
  project: ProjectListItem
  isOwner: boolean
  onClose: () => void
}) {
  const { members, isLoading, error, reload } = useProjectMembers(project.id)

  const [isAdding, setIsAdding] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleAdd = async () => {
    if (email.trim() === '' || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await addMember(project.id, { email: email.trim() })
      reload()
      setEmail('')
      setIsAdding(false)
    } catch (error) {
      // 실패하면 입력 내용을 유지하고 오류를 표시한다.
      setSubmitError(getErrorMessage(error, '팀원 추가에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isAdding) {
    return (
      <Modal
        title="팀원 추가"
        description="프로젝트에 추가할 사용자의 이메일을 입력하세요."
        onClose={onClose}
        maxWidth="max-w-[460px]"
        footer={
          <>
            <button type="button" onClick={() => setIsAdding(false)} className={buttonClass}>
              취소
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={email.trim() === '' || isSubmitting}
              className={primaryButtonClass}
            >
              {isSubmitting ? '추가 중...' : '팀원 추가'}
            </button>
          </>
        }
      >
        <FormField id="member-email" label="이메일">
          <input
            id="member-email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="user@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleAdd()
            }}
            className={`${formControlClass} h-9`}
          />
        </FormField>
        <FormError message={submitError} />
      </Modal>
    )
  }

  const renderList = () => {
    if (error) return <ErrorMessage message={error} onRetry={reload} />
    if (isLoading && members.length === 0) return <Loading message="팀원을 불러오는 중입니다." />
    if (members.length === 0) return <EmptyState message="등록된 팀원이 없어요." />

    return (
      <ul className="rounded-xl border border-line2">
        {members.map((member) => (
          <li
            key={member.memberId}
            className="flex items-center gap-3 border-b border-line2 px-3.5 py-3 last:border-b-0"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-page font-semibold text-muted"
            >
              {member.name.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate font-medium">{member.name}</b>
              <span className="block truncate text-[12.5px] text-muted">{member.email}</span>
            </div>
            <StatusBadge tone={member.role === 'OWNER' ? 'merged' : 'muted'} plain>
              {PROJECT_ROLE_LABEL[member.role]}
            </StatusBadge>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Modal
      title={members.length > 0 ? `팀원 (${members.length}명)` : '팀원'}
      description={project.name}
      onClose={onClose}
      maxWidth="max-w-[460px]"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass}>
            닫기
          </button>
          {/* 팀원 등록은 OWNER만 (설계서 2.3 권한표) */}
          {isOwner && (
            <button type="button" onClick={() => setIsAdding(true)} className={primaryButtonClass}>
              팀원 추가
            </button>
          )}
        </>
      }
    >
      <div className="max-h-[360px] overflow-y-auto">{renderList()}</div>
    </Modal>
  )
}

export default MemberModal
