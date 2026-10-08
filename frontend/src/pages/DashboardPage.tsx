import AlertBanner from '../components/dashboard/AlertBanner'
import MyTaskList from '../components/dashboard/MyTaskList'
import RecentDeployList from '../components/dashboard/RecentDeployList'
import ProjectList from '../components/project/ProjectList'
import { primaryButtonClass } from '../components/common/styles'
import { useDashboardData } from '../hooks/useDashboardData'
import { useProjectContext } from '../hooks/useProjectContext'
import { formatClock } from '../utils/date'

// 설계서 4.4 대시보드 (2차 프로젝트 목록 포함)
function DashboardPage() {
  const {
    projectList,
    currentUser,
    currentProject,
    selectProject,
    isLoading: isProjectLoading,
    error: projectError,
  } = useProjectContext()

  const projectId = currentProject?.id ?? null
  const { myTasks, deployments, incidents } = useDashboardData(
    projectId,
    currentUser?.userId ?? null,
  )

  const collectedAt = deployments.data?.collectedAt

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">
            {currentUser ? `${currentUser.name}님, 오늘 확인할 것` : '오늘 확인할 것'}
          </h1>
          {collectedAt && (
            <p className="mt-1 text-[13px] text-muted">
              마지막 수집 {formatClock(collectedAt)}
            </p>
          )}
        </div>

        {/* 프로젝트 만들기 모달은 07 단계에서 연결한다. */}
        <button type="button" disabled className={primaryButtonClass}>
          프로젝트 만들기
        </button>
      </div>

      {projectId !== null && incidents.data && (
        <AlertBanner incidents={incidents.data} projectId={projectId} />
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

      <ProjectList
        projects={projectList}
        currentProjectId={projectId}
        isLoading={isProjectLoading}
        error={projectError}
        onSelect={selectProject}
      />
    </>
  )
}

export default DashboardPage
