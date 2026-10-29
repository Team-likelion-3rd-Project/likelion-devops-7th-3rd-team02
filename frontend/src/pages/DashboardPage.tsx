import { useState } from 'react'

import AlertBanner from '../components/dashboard/AlertBanner'
import EnvironmentSummary from '../components/dashboard/EnvironmentSummary'
import MyTaskList from '../components/dashboard/MyTaskList'
import RecentDeployList from '../components/dashboard/RecentDeployList'
import ProjectCreateModal from '../components/project/ProjectCreateModal'
import ProjectInfoModal from '../components/project/ProjectInfoModal'
import { EmptyState, ErrorMessage, Loading } from '../components/common/PanelState'
import { primaryButtonClass, textLinkClass } from '../components/common/styles'
import { useDashboardData } from '../hooks/useDashboardData'
import { useProjectContext } from '../hooks/useProjectContext'
import { formatClock } from '../utils/date'
import { isProjectOwner } from '../utils/projectRole'

// 설계서 4.4 대시보드: 사이드바에서 고른 프로젝트 하나의 홈 (프로젝트 고르기·만들기는 사이드바 전환 드롭다운)
function DashboardPage() {
  const {
    projectList,
    currentUser,
    currentProject,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProjectContext()

  const projectId = currentProject?.id ?? null
  const { myTasks, deployments, incidents } = useDashboardData(
    projectId,
    currentUser?.userId ?? null,
  )

  const collectedAt = deployments.data?.collectedAt
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)

  const title = currentUser ? `${currentUser.name}님, 오늘 확인할 것` : '오늘 확인할 것'

  // 참여 중인 프로젝트가 없으면 첫 프로젝트 만들기를 안내한다.
  if (!currentProject) {
    return (
      <>
        <h1 className="mb-5 text-[24px] font-bold tracking-[-0.02em]">{title}</h1>
        {projectError ? (
          <ErrorMessage message={projectError} />
        ) : isProjectLoading || projectList.length > 0 ? (
          <Loading message="프로젝트를 불러오는 중입니다." />
        ) : (
          <EmptyState
            message="참여 중인 프로젝트가 없어요. 첫 프로젝트를 만들어 보세요."
            action={
              <button type="button" onClick={() => setIsCreateOpen(true)} className={primaryButtonClass}>
                프로젝트 만들기
              </button>
            }
          />
        )}
        {isCreateOpen && <ProjectCreateModal onClose={() => setIsCreateOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">{title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
          <span title={currentProject.name} className="max-w-[420px] truncate">
            {currentProject.name}
          </span>
          {/* 설명, 소유자, 팀원 수, 저장소 연결 등은 프로젝트 정보 모달에서 본다 (설계서 4.4) */}
          <button type="button" onClick={() => setIsInfoOpen(true)} className={`cursor-pointer ${textLinkClass}`}>
            프로젝트 정보
          </button>
          {collectedAt && <span>마지막 수집 {formatClock(collectedAt)}</span>}
        </p>
      </div>

      {projectId !== null && incidents.data && (
        <AlertBanner incidents={incidents.data} projectId={projectId} />
      )}

      {projectId !== null && (
        <EnvironmentSummary
          projectId={projectId}
          canConnect={isProjectOwner(currentProject)}
        />
      )}

      {projectId !== null && (
        <div className="mb-5 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
          <MyTaskList
            projectId={projectId}
            tasks={myTasks.data}
            isLoading={myTasks.isLoading}
            error={myTasks.error}
            onRetry={myTasks.reload}
          />
          <RecentDeployList
            projectId={projectId}
            deployments={deployments.data?.deployments ?? null}
            isLoading={deployments.isLoading}
            error={deployments.error}
            onRetry={deployments.reload}
          />
        </div>
      )}

      {isInfoOpen && (
        <ProjectInfoModal
          project={currentProject}
          onClose={() => setIsInfoOpen(false)}
        />
      )}
    </>
  )
}

export default DashboardPage
