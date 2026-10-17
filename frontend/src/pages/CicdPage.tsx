import { useParams } from 'react-router-dom'

import CurrentDeploymentPanel from '../components/cicd/CurrentDeploymentPanel'
import DeploymentTable from '../components/cicd/DeploymentTable'
import IntegrationPanel from '../components/cicd/IntegrationPanel'
import PipelineStrip from '../components/cicd/PipelineStrip'
import PipelineTable from '../components/cicd/PipelineTable'
import { connectGithub } from '../api/integrationApi'
import { CICD_PAGE_SIZE, useCicdData } from '../hooks/useCicdData'
import { useProjectContext } from '../hooks/useProjectContext'
import { formatClock } from '../utils/date'
import { isProjectOwner } from '../utils/projectRole'

// 설계서 4.7 CI/CD (조회 전용: 승인·롤백 버튼, 작성자 없음)
function CicdContent({ projectId }: { projectId: number }) {
  const {
    github,
    latestPipeline,
    latestDeployment,
    pipelines,
    pipelinePage,
    setPipelinePage,
    deployments,
    deploymentPage,
    setDeploymentPage,
    collectedAt,
  } = useCicdData(projectId)
  const { currentProject, currentUser } = useProjectContext()

  // 파이프라인(C1)은 연결된 GitHub 저장소의 Actions 실행 기록이라, 연결이 없다고 확인되면 안내만 표시한다 (설계서 9.7).
  // 배포 이력(D1)은 CI가 Webhook(D3)으로 보내므로 저장소 연결과 무관하게 표시한다.
  const isRepositoryMissing = !github.isLoading && !github.error && github.data === null

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">CI/CD</h1>
        {collectedAt && (
          <p className="mt-1 text-[13px] text-muted">마지막 수집 {formatClock(collectedAt)}</p>
        )}
      </div>

      <div className="mb-5 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
        <CurrentDeploymentPanel
          deployment={latestDeployment.data ? (latestDeployment.data.deployments[0] ?? null) : undefined}
          isLoading={latestDeployment.isLoading}
          error={latestDeployment.error}
          onRetry={latestDeployment.reload}
        />

        <IntegrationPanel
          canConnect={isProjectOwner(currentProject, currentUser?.userId)}
          github={{
            value: github.data === null ? null : github.data?.fullName,
            isLoading: github.isLoading,
            error: github.error,
            onRetry: github.reload,
            onConnect: async (repositoryUrl) => {
              await connectGithub(projectId, { repositoryUrl })
              github.reload()
            },
          }}
        />
      </div>

      <PipelineStrip
        pipeline={latestPipeline.data ? (latestPipeline.data.pipelines[0] ?? null) : undefined}
        isLoading={latestPipeline.isLoading}
        error={latestPipeline.error}
        onRetry={latestPipeline.reload}
        isConnected={!isRepositoryMissing}
      />

      {!isRepositoryMissing && (
        <PipelineTable
          rows={pipelines.data?.pipelines}
          isLoading={pipelines.isLoading}
          error={pipelines.error}
          onRetry={pipelines.reload}
          page={pipelinePage}
          pageSize={CICD_PAGE_SIZE}
          totalCount={pipelines.data?.totalCount}
          onPageChange={setPipelinePage}
          className="mb-5"
        />
      )}

      <DeploymentTable
        rows={deployments.data?.deployments}
        isLoading={deployments.isLoading}
        error={deployments.error}
        onRetry={deployments.reload}
        page={deploymentPage}
        pageSize={CICD_PAGE_SIZE}
        totalCount={deployments.data?.totalCount}
        onPageChange={setDeploymentPage}
      />
    </>
  )
}

// 프로젝트가 바뀌면 페이지 상태를 새로 시작한다.
function CicdPage() {
  const params = useParams()
  const projectId = params.projectId ? Number(params.projectId) : null

  if (projectId === null || Number.isNaN(projectId)) {
    return null
  }

  return <CicdContent key={projectId} projectId={projectId} />
}

export default CicdPage
