import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { connectGithub } from '../../api/integrationApi'
import { useProjectContext } from '../../hooks/useProjectContext'
import { getErrorMessage } from '../../utils/error'

// 설계서 4.9, 9.10 프로젝트 만들기: 이름만 필수, 저장소 정보는 선택.
// 저장 흐름 (3.3): 프로젝트 생성 → 생성된 projectId로 GitHub 연결(G1). 토큰은 입력받지 않는다.
function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { createProject, selectProject } = useProjectContext()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 프로젝트는 만들어졌지만 연결이 실패한 경우
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null)
  const [connectError, setConnectError] = useState('')

  const isFormValid = name.trim() !== ''

  const handleCreate = async () => {
    if (!isFormValid || isSubmitting) return

    setIsSubmitting(true)
    setError('')

    let projectId: number

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
      })
      projectId = project.id
      // 새로 만든 프로젝트를 현재 프로젝트로 선택한다.
      selectProject(projectId)
    } catch (error) {
      // 생성 실패: 입력 내용을 유지하고 오류를 표시한다.
      setError(getErrorMessage(error, '프로젝트 생성에 실패했습니다.'))
      setIsSubmitting(false)
      return
    }

    // 저장소 주소가 없으면 연결 없이 끝낸다.
    if (githubUrl.trim()) {
      try {
        await connectGithub(projectId, { repositoryUrl: githubUrl.trim() })
      } catch (error) {
        // 프로젝트는 유지하고 연결 실패를 안내한다 (설계서 3.3, 5.2).
        setIsSubmitting(false)
        setCreatedProjectId(projectId)
        setConnectError(getErrorMessage(error, '저장소 연결에 실패했습니다.'))
        return
      }
    }

    setIsSubmitting(false)
    onClose()
    // 새 프로젝트의 대시보드로 이동한다. 빈 칸 안내가 다음 할 일(업무 추가, 저장소 연결)을 알려 준다.
    navigate('/projects')
  }

  if (createdProjectId !== null) {
    return (
      <Modal
        title="프로젝트가 생성되었습니다."
        description="저장소 연결에 실패했어요. 설정 화면에서 다시 연결할 수 있어요."
        onClose={onClose}
        maxWidth="max-w-[460px]"
        footer={
          <>
            <button type="button" onClick={onClose} className={buttonClass}>
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/projects/${createdProjectId}/settings#repository`)
              }}
              className={primaryButtonClass}
            >
              설정에서 연결하기
            </button>
          </>
        }
      >
        <p role="alert" className="rounded-[10px] bg-err-bg px-3.5 py-[11px] text-[13px] text-err">
          {connectError}
        </p>
      </Modal>
    )
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

      <section className="flex flex-col gap-3.5 border-t border-line2 pt-4">
        <h3 className="text-[14px] font-semibold">저장소 연결</h3>

        <div className="flex flex-col gap-1.5">
          <FormField id="project-github" label="GitHub 저장소 주소">
            <input
              id="project-github"
              type="url"
              placeholder="https://github.com/owner/repo"
              aria-describedby="project-github-hint"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              className={`${formControlClass} h-9 font-mono text-[12.5px]`}
            />
          </FormField>
          <small id="project-github-hint" className="text-[12.5px] text-muted">
            연결하면 CI/CD 화면에 GitHub Actions 실행 기록이 보여요.
          </small>
        </div>
      </section>

      <FormError message={error} />
    </Modal>
  )
}

export default ProjectCreateModal
