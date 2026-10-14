import CommitLabel from './CommitLabel'
import HistoryTable from './HistoryTable'
import type { HistoryColumn } from './HistoryTable'
import StatusBadge from '../common/StatusBadge'
import { formatDayTime } from '../../utils/date'
import { DEPLOYMENT_STATUS } from '../../utils/status'
import type { Deployment } from '../../types/deployment'

const mono = 'font-mono text-[12.5px]'

const COLUMNS: HistoryColumn<Deployment>[] = [
  { header: '리비전', render: (row) => row.revision, className: mono },
  { header: '이미지 태그', render: (row) => row.imageTag, className: mono },
  { header: '커밋', render: (row) => <CommitLabel sha={row.commitSha} message={row.commitMessage} /> },
  { header: '환경', render: (row) => row.environment },
  {
    header: '상태',
    render: (row) => (
      <StatusBadge tone={DEPLOYMENT_STATUS[row.status].tone}>
        {DEPLOYMENT_STATUS[row.status].label}
      </StatusBadge>
    ),
  },
  { header: '배포 시각', render: (row) => formatDayTime(row.deployedAt) },
]

type DeploymentTableProps = Omit<
  Parameters<typeof HistoryTable<Deployment>>[0],
  'title' | 'columns' | 'emptyMessage' | 'loadingMessage'
>

function DeploymentTable(props: DeploymentTableProps) {
  return (
    <HistoryTable<Deployment>
      title="배포 이력"
      columns={COLUMNS}
      emptyMessage="아직 배포 기록이 없어요."
      loadingMessage="배포 이력을 불러오는 중입니다."
      {...props}
    />
  )
}

export default DeploymentTable
