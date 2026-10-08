import DataTable from '../common/DataTable'
import type { DataColumn } from '../common/DataTable'
import Panel from '../common/Panel'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import type { K8sDeployment } from '../../types/monitoring'

const COLUMNS: DataColumn<K8sDeployment>[] = [
  { header: '배포', render: (row) => row.name, className: 'font-mono text-[12.5px]' },
  { header: '목표', render: (row) => row.desiredReplicas },
  { header: '사용 가능', render: (row) => row.availableReplicas },
  { header: '준비됨', render: (row) => row.readyReplicas },
  { header: '최신 버전', render: (row) => row.updatedReplicas },
]

// 설계서 4.8 배포 상태: 목표, 사용 가능, 준비됨, 최신 버전 수
function K8sDeploymentTable({
  deployments,
  isLoading,
  error,
  onRetry,
}: {
  deployments: K8sDeployment[] | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
}) {
  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !deployments) return <Loading message="배포 상태를 불러오는 중입니다." />
    if (!deployments || deployments.length === 0) return <EmptyState message="수집된 배포가 없어요." />
    return <DataTable columns={COLUMNS} rows={deployments} getRowKey={(row) => row.name} />
  }

  return (
    <Panel title="배포 상태" className="mb-5">
      {renderBody()}
    </Panel>
  )
}

export default K8sDeploymentTable
