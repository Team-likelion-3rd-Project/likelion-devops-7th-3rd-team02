import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Modal from '../common/Modal'
import FormField, { FormError, formControlClass } from '../common/FormField'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { connectGithub, connectGitlab } from '../../api/integrationApi'
import { useProjectContext } from '../../hooks/useProjectContext'
import { getErrorMessage } from '../../utils/error'

interface ConnectFailure {
  provider: string
  message: string
}

// 설계서 4.9, 9.10 프로젝트 만들기: 이름만 필수, 저장소 정보는 선택.
// 저장 흐름 (3.3): 프로젝트 생성 → 생성된 projectId로 연결 요청.
// 연결 전 저장소 확인, 토큰 입력(Backend 답변 대기)은 하지 않는다.
function ProjectCreateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { createProject, selectProject } = useProjectContext()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [gitlabPath, setGitlabPath] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 프로젝트는 만들어졌지만 연결이 실패한 경우
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null)
  const [failures, setFailures] = useState<ConnectFailure[]>([])

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

    const connections: { provider: string; request: () => Promise<unknown> }[] = []

    if (githubUrl.trim()) {
      connections.push({
        provider: 'GitHub',
        request: () => connectGithub(projectId, { repositoryUrl: githubUrl.trim() }),
      })
    }
    if (gitlabPath.trim()) {
      connections.push({
        provider: 'GitLab',
        request: () => connectGitlab(projectId, { projectPath: gitlabPath.trim() }),
      })
    }

    // GitHub와 GitLab 연결은 서로 독립이라 함께 요청하고, 한쪽 실패가 다른 쪽을 막지 않게 한다.
    const results = await Promise.allSettled(connections.map((connection) => connection.request()))

    const failed = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            {
              provider: connections[index].provider,
              message: getErrorMessage(result.reason, '연결에 실패했습니다.'),
            },
          ]
        : [],
    )

    setIsSubmitting(false)

    if (failed.length === 0) {
      onClose()
      return
    }

    // 프로젝트는 유지하고 연결 실패를 안내한다 (설계서 3.3, 5.2).
    setCreatedProjectId(projectId)
    setFailures(failed)
  }

  if (createdProjectId !== null) {
    return (
      <Modal
        title="프로젝트가 생성되었습니다."
        description="저장소 연결에 실패했어요. CI/CD 화면에서 다시 연결할 수 있어요."
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
                navigate(`/projects/${createdProjectId}/cicd`)
              }}
              className={primaryButtonClass}
            >
              CI/CD에서 연결하기
            </button>
          </>
        }
      >
        <ul role="alert" className="flex flex-col gap-2">
          {failures.map((failure) => (
            <li
              key={failure.provider}
              className="rounded-[10px] bg-err-bg px-3.5 py-[11px] text-[13px] text-err"
            >
              <b className="font-semibold">{failure.provider}</b> {failure.message}
            </li>
          ))}
        </ul>
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

        <FormField id="project-github" label="GitHub 저장소 주소">
          <input
            id="project-github"
            type="url"
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(event) => setGithubUrl(event.target.value)}
            className={`${formControlClass} h-9 font-mono text-[12.5px]`}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <FormField id="project-gitlab" label="GitLab 프로젝트 경로">
            <input
              id="project-gitlab"
              type="text"
              placeholder="group/project"
              aria-describedby="project-gitlab-hint"
              value={gitlabPath}
              onChange={(event) => setGitlabPath(event.target.value)}
              className={`${formControlClass} h-9 font-mono text-[12.5px]`}
            />
          </FormField>
          {/* GitLab은 프로젝트 목록 조회 API가 없어 경로를 직접 입력한다 (설계서 4.9). */}
          <small id="project-gitlab-hint" className="text-[12.5px] text-muted">
            CI/CD 파이프라인을 불러올 GitLab 프로젝트예요.
          </small>
        </div>
      </section>

      <FormError message={error} />
    </Modal>
  )
}

export default ProjectCreateModal
