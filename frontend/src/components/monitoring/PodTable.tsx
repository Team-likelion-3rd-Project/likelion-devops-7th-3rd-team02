import DataTable from '../common/DataTable'
import type { DataColumn } from '../common/DataTable'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatAge } from '../../utils/date'
import { podStatusTone } from '../../utils/status'
import type { K8sPod } from '../../types/monitoring'

const mono = 'font-mono text-[12.5px]'

// 설계서 4.8 파드: 이름, 상태, 준비, 재시작(0이 아니면 강조), 생성, 이미지 (파드별 CPU·메모리, 로그 없음)
const COLUMNS: DataColumn<K8sPod>[] = [
  { header: '이름', render: (row) => row.name, className: mono },
  {
    header: '상태',
    render: (row) => <StatusBadge tone={podStatusTone(row.status)}>{row.status}</StatusBadge>,
  },
  { header: '준비', render: (row) => `${row.readyContainers}/${row.totalContainers}` },
  {
    header: '재시작',
    render: (row) => row.restartCount,
    className: (row) => (row.restartCount > 0 ? 'font-semibold text-warn' : ''),
  },
  { header: '생성', render: (row) => formatAge(row.createdAt) },
  { header: '이미지', render: (row) => row.image, className: mono },
]

function PodTable({
  pods,
  isLoading,
  error,
  onRetry,
}: {
  pods: K8sPod[] | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
}) {
  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !pods) return <Loading message="파드 목록을 불러오는 중입니다." />
    if (!pods || pods.length === 0) return <EmptyState message="실행 중인 파드가 없어요." />
    return <DataTable columns={COLUMNS} rows={pods} getRowKey={(row) => row.name} />
  }

  return <Panel title="파드">{renderBody()}</Panel>
}

export default PodTable
