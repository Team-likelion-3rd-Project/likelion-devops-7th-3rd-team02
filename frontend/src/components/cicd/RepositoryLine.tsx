import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import { focusRing, textLinkClass } from '../common/styles'
import type { GithubRepository } from '../../types/integration'

// 설계서 4.7: 이 화면이 보는 GitHub 저장소(파이프라인 C1의 출처)를 제목 아래 한 줄로 보여준다.
// 연결·변경은 설정 화면 한 곳에서만 한다 (설계서 4.12).
function RepositoryLine({
  projectId,
  repository,
  isLoading,
  error,
  onRetry,
  canConnect,
}: {
  projectId: number
  repository: GithubRepository | null
  isLoading: boolean
  error: string
  onRetry: () => void
  canConnect: boolean
}) {
  if (error) {
    return (
      <p role="alert" className="flex flex-wrap items-center gap-x-2 text-err">
        저장소 정보를 불러오지 못했어요.
        <button type="button" onClick={onRetry} className={`cursor-pointer ${textLinkClass}`}>
          다시 시도
        </button>
      </p>
    )
  }

  if (isLoading && repository === null) return <p className="text-muted">저장소를 확인하는 중이에요.</p>

  if (repository) {
    return (
      <p className="flex min-w-0 items-center gap-1.5">
        <span className="flex-none text-muted">GitHub</span>
        <a
          href={repository.url}
          target="_blank"
          rel="noreferrer"
          title={repository.fullName}
          className={`inline-flex min-w-0 items-center gap-1 font-mono text-[13px] text-accent hover:underline ${focusRing}`}
        >
          <span className="truncate">{repository.fullName}</span>
          <ExternalLink aria-hidden="true" size={13} className="flex-none" />
          <span className="sr-only">(새 탭에서 열림)</span>
        </a>
      </p>
    )
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-muted">
      저장소가 연결되어 있지 않아요.
      {canConnect ? (
        <Link to={`/projects/${projectId}/settings#repository`} className={textLinkClass}>
          설정에서 연결하기
        </Link>
      ) : (
        <span>연결은 프로젝트 소유자에게 요청해 주세요.</span>
      )}
    </p>
  )
}

export default RepositoryLine
