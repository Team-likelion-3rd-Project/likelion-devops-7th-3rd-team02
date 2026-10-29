import type { ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

import KeyValueList from '../common/KeyValueList'
import Modal from '../common/Modal'
import { buttonClass, focusRing, textLinkClass } from '../common/styles'
import { getGithubRepository } from '../../api/integrationApi'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useProjectContext } from '../../hooks/useProjectContext'
import { formatDate } from '../../utils/date'
import { isProjectOwner, projectRoleLabel } from '../../utils/projectRole'
import type { ProjectListItem } from '../../types/project'

const muted = 'text-muted'

// 설계서 4.4: 대시보드의 "프로젝트 정보"로 연다. 다른 곳에서 말줄임된 이름과 설명을 여기서 모두 보여준다.
// 프로젝트 수정·삭제는 범위 확정 전이라 버튼을 두지 않는다 (설계서 1.3).
function ProjectInfoModal({
  project,
  onClose,
}: {
  project: ProjectListItem
  onClose: () => void
}) {
  const isOwner = isProjectOwner(project)
  const { members, isMembersLoading: isMemberLoading, membersError: memberError } = useProjectContext()

  // 연결이 없으면 data: null, 조회 실패(현재 Backend 미구현 등)는 error
  const github = useAsyncData(
    () => getGithubRepository(project.id).then((response) => response.data.data ?? null),
    `project-info-github-${project.id}`,
    '확인할 수 없어요',
  )

  const settingsPath = `/projects/${project.id}/settings#repository`

  // 연결 안 됨: 연결할 수 있는 OWNER에게만 설정으로 가는 안내를 보여준다.
  const notConnected = (
    <span className="flex flex-wrap gap-x-2">
      <span className={muted}>연결 안 됨</span>
      {isOwner && (
        <Link to={settingsPath} onClick={onClose} className={textLinkClass}>
          설정에서 연결
        </Link>
      )}
    </span>
  )

  const repositoryValue = <T,>(
    state: { data: T | null; isLoading: boolean; error: string },
    render: (data: T) => ReactNode,
  ) => {
    if (state.isLoading && state.data === null) return <span className={muted}>불러오는 중</span>
    if (state.error) return <span className={muted}>확인할 수 없어요</span>
    return state.data ? render(state.data) : notConnected
  }

  return (
    <Modal
      title={project.name}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={buttonClass}>
          닫기
        </button>
      }
    >
      <p
        className={`break-keep whitespace-pre-line [overflow-wrap:anywhere] ${project.description ? '' : muted}`}
      >
        {project.description || '설명이 없어요.'}
      </p>

      <KeyValueList
        items={[
          { label: '내 역할', value: projectRoleLabel(project) },
          { label: '소유자', value: project.ownerName },
          { label: '만든 날', value: formatDate(project.createdAt) },
          {
            label: '팀원',
            value: memberError ? (
              <span className={muted}>확인할 수 없어요</span>
            ) : isMemberLoading && members.length === 0 ? (
              <span className={muted}>불러오는 중</span>
            ) : (
              `${members.length}명`
            ),
          },
          {
            label: 'GitHub',
            value: repositoryValue(github, (repository) => (
              <a
                href={repository.url}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex max-w-full items-center gap-1 font-mono text-[12.5px] text-accent hover:underline ${focusRing}`}
              >
                <span className="truncate">{repository.fullName}</span>
                <ExternalLink aria-hidden="true" size={13} className="flex-none" />
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
            )),
          },
        ]}
      />
    </Modal>
  )
}

export default ProjectInfoModal
