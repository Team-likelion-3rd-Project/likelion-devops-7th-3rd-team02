import type { ReactNode } from 'react'
import { Link, useMatch } from 'react-router-dom'

import { EmptyState } from './PanelState'
import { buttonClass } from './styles'
import { useProjectContext } from '../../hooks/useProjectContext'

// 주소의 프로젝트가 내 프로젝트 목록에 없으면(팀에서 빠졌거나 없는 프로젝트) 화면 대신 안내를 보여준다.
// 데이터는 Backend가 권한을 확인해 막고, 여기서는 패널마다 오류가 뜨는 대신 한 번에 안내한다.
function ProjectGate({ children }: { children: ReactNode }) {
  const match = useMatch('/projects/:projectId/*')
  const { projectList, isLoading, error } = useProjectContext()

  const urlProjectId = match?.params.projectId ? Number(match.params.projectId) : null
  const isUnknownProject =
    urlProjectId !== null &&
    !isLoading &&
    !error &&
    !projectList.some((project) => project.id === urlProjectId)

  if (!isUnknownProject) return children

  return (
    <EmptyState
      message="접근할 수 없는 프로젝트예요. 팀원이 아니거나 없는 프로젝트입니다."
      action={
        <Link to="/projects" className={buttonClass}>
          대시보드로 가기
        </Link>
      }
    />
  )
}

export default ProjectGate
