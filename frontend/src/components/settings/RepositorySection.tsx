import { useState } from 'react'
import type { FormEvent } from 'react'
import { ExternalLink } from 'lucide-react'

import { FormError } from '../common/FormField'
import { ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, fieldClass, focusRing } from '../common/styles'
import { connectGithub } from '../../api/integrationApi'
import { getErrorMessage } from '../../utils/error'
import type { GithubRepository } from '../../types/integration'

// 설정 > 저장소: GitHub 저장소 연결(G1)과 조회(G2). 연결·변경은 OWNER만 (Backend 확정)
function RepositorySection({
  projectId,
  repository,
  isLoading,
  error,
  onRetry,
  onConnected,
  canEdit,
}: {
  projectId: number
  repository: GithubRepository | null
  isLoading: boolean
  error: string
  onRetry: () => void
  onConnected: () => void
  canEdit: boolean
}) {
  const [input, setInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (error) return <ErrorMessage message={error} onRetry={onRetry} />
  if (isLoading && repository === null) return <Loading message="저장소 정보를 불러오는 중입니다." />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (input.trim() === '' || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await connectGithub(projectId, { repositoryUrl: input.trim() })
      setInput('')
      setIsEditing(false)
      onConnected()
    } catch (error) {
      // 입력 내용을 유지하고 오류를 표시한다 (설계서 5.2).
      setSubmitError(getErrorMessage(error, '저장소 연결에 실패했습니다.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const showForm = canEdit && (repository === null || isEditing)

  return (
    <>
      {repository ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a
            href={repository.url}
            target="_blank"
            rel="noreferrer"
            title={repository.fullName}
            className={`inline-flex max-w-full min-w-0 items-center gap-1 font-mono text-[13px] text-accent hover:underline ${focusRing}`}
          >
            <span className="truncate">{repository.fullName}</span>
            <ExternalLink aria-hidden="true" size={13} className="flex-none" />
            <span className="sr-only">(새 탭에서 열림)</span>
          </a>
          {canEdit && !isEditing && (
            <button type="button" onClick={() => setIsEditing(true)} className={buttonClass}>
              저장소 바꾸기
            </button>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted">
          연결된 저장소가 없어요.{!canEdit && ' 연결은 프로젝트 소유자가 할 수 있어요.'}
        </p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label htmlFor="settings-github-url" className="font-medium">
            GitHub 저장소 주소
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="settings-github-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className={`${fieldClass} min-w-[240px] flex-1 font-mono text-[12.5px]`}
            />
            {isEditing && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setInput('')
                  setSubmitError('')
                }}
                className={buttonClass}
              >
                취소
              </button>
            )}
            <button type="submit" disabled={input.trim() === '' || isSubmitting} className={buttonClass}>
              {isSubmitting ? '연결 중...' : '연결'}
            </button>
          </div>
          <small className="text-[12.5px] text-muted">
            DevFlow가 이 저장소의 GitHub Actions 실행 기록을 읽어요. 비공개 저장소는 DevFlow 서버에 읽기 권한이 있어야 연결돼요.
          </small>
          <FormError message={submitError} />
        </form>
      )}
    </>
  )
}

export default RepositorySection
