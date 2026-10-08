import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { focusRing } from '../common/styles'
import { PROJECT_ROLE_LABEL } from '../../utils/projectRole'
import type { ProjectListItem } from '../../types/project'

// 설계서 4.4 내 프로젝트: 이름, 설명, 내 역할. 선택하면 현재 프로젝트가 바뀐다.
function ProjectList({
  projects,
  currentProjectId,
  isLoading,
  error,
  onSelect,
}: {
  projects: ProjectListItem[]
  currentProjectId: number | null
  isLoading: boolean
  error: string
  onSelect: (projectId: number) => void
}) {
  const renderBody = () => {
    if (error) return <ErrorMessage message={error} />
    if (isLoading) return <Loading message="프로젝트를 불러오는 중입니다." />
    if (projects.length === 0) return <EmptyState message="참여 중인 프로젝트가 없어요." />

    return (
      <ul>
        {projects.map((project) => {
          const isCurrent = project.id === currentProjectId

          return (
            <li key={project.id} className="border-b border-line2 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(project.id)}
                aria-current={isCurrent ? 'true' : undefined}
                className={`flex w-full cursor-pointer items-center gap-3 px-[18px] py-[13px] text-left hover:bg-hover ${focusRing} focus-visible:-outline-offset-2`}
              >
                <div className="min-w-0 flex-1">
                  <b className="block truncate font-medium">{project.name}</b>
                  {project.description && (
                    <span className="block truncate text-[12.5px] text-muted">
                      {project.description}
                    </span>
                  )}
                </div>
                {project.role && (
                  <StatusBadge
                    tone={project.role === 'OWNER' ? 'merged' : 'muted'}
                    plain
                  >
                    {PROJECT_ROLE_LABEL[project.role]}
                  </StatusBadge>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  return <Panel title="내 프로젝트">{renderBody()}</Panel>
}

export default ProjectList
