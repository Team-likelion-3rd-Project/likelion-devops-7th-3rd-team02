import { useState } from 'react'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { useProjectContext } from '../../hooks/useProjectContext'
import { getErrorMessage } from '../../utils/error'

// 설계서 4.9, 9.10 프로젝트 만들기: 이름만 필수.
// 저장소 연결 입력(GitHub 주소, GitLab 경로)과 생성 후 연결 호출(3.3)은 연동 작업에서 추가한다.
function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  const { createProject, selectProject } = useProjectContext()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = name.trim() !== ''

  const handleCreate = async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
      })
      // 새로 만든 프로젝트를 현재 프로젝트로 선택한다.
      selectProject(project.id)
      onClose()
    } catch (error) {
      setError(getErrorMessage(error, '프로젝트 생성에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="새 프로젝트 만들기"
      description="저장소는 나중에 연결해도 돼요."
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
            {isSubmitting ? '만드는 중...' : '프로젝트 만들기'}
          </button>
        </>
      }
    >
      <FormField id="project-name" label="프로젝트 이름">
        <input
          id="project-name"
          type="text"
          maxLength={100}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${formControlClass} h-9`}
        />
      </FormField>

      <FormField id="project-description" label="설명">
        <textarea
          id="project-description"
          rows={3}
          maxLength={500}
          placeholder="프로젝트를 한 줄로 설명해 주세요."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={`${formControlClass} resize-none py-2.5`}
        />
      </FormField>

      <FormError message={error} />
    </Modal>
  )
}

export default ProjectCreateModal
