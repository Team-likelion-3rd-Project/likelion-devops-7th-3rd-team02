import type { ReactNode } from 'react'

import CloudConnectNotice from '../common/CloudConnectNotice'
import DataTable from '../common/DataTable'
import type { DataColumn } from '../common/DataTable'
import KeyValueList from '../common/KeyValueList'
import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import type { BadgeTone } from '../common/StatusBadge'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { formatRelativeTime } from '../../utils/date'
import { CLOUD_NOT_CONNECTED } from '../../utils/error'
import { formatMetric } from '../../utils/monitoring'
import type { DatabaseStatus, K8sHpa, K8sNode, LoadBalancerStatus } from '../../types/environment'

const mono = 'font-mono text-[12.5px]'

interface PanelState<T> {
  data: T | null
  isLoading: boolean
  error: string
  errorCode: string
  reload: () => void
}

const percent = (value: number | null) => (value === null ? '-' : `${formatMetric(value)}%`)
const count = (value: number | null) => (value === null ? '-' : value.toLocaleString('ko-KR'))

// 패널 하나의 공통 상태: 연결 없음은 연결 안내, 그 밖의 오류는 다시 시도
function InfraPanel<T>({
  title,
  state,
  projectId,
  canConnect,
  loadingMessage,
  className = '',
  children,
}: {
  title: string
  state: PanelState<T>
  projectId: number
  canConnect: boolean
  loadingMessage: string
  className?: string
  children: (data: T) => ReactNode
}) {
  if (state.errorCode === CLOUD_NOT_CONNECTED) {
    return (
      <CloudConnectNotice
        projectId={projectId}
        canConnect={canConnect}
        title={title}
        message={state.error}
        className={className}
      />
    )
  }

  const renderBody = () => {
    if (state.error) return <ErrorMessage message={state.error} onRetry={state.reload} />
    if (state.isLoading && state.data === null) return <Loading message={loadingMessage} />
    if (state.data === null) return null
    return children(state.data)
  }

  return (
    <Panel title={title} className={className}>
      {renderBody()}
    </Panel>
  )
}

const NODE_COLUMNS: DataColumn<K8sNode>[] = [
  { header: '노드', render: (row) => row.name, className: mono },
  { header: '역할', render: (row) => row.roles.join(', ') },
  {
    header: '상태',
    render: (row) =>
      row.ready ? <StatusBadge tone="ok">Ready</StatusBadge> : <StatusBadge tone="err">NotReady</StatusBadge>,
  },
  { header: 'CPU', render: (row) => percent(row.cpuUsage) },
  { header: '메모리', render: (row) => percent(row.memoryUsage) },
  { header: 'kubelet', render: (row) => row.kubeletVersion, className: `${mono} text-muted` },
]

const range = (min: number | null, max: number | null) =>
  min === null || max === null ? '-' : `${min}~${max}`

const HPA_COLUMNS: DataColumn<K8sHpa>[] = [
  { header: 'HPA', render: (row) => row.name, className: mono },
  { header: '대상', render: (row) => row.target, className: mono },
  {
    header: '레플리카 (현재 → 목표)',
    render: (row) => `${count(row.currentReplicas)} → ${count(row.desiredReplicas)}`,
  },
  { header: '범위', render: (row) => range(row.minReplicas, row.maxReplicas) },
  {
    header: 'CPU (현재 / 기준)',
    render: (row) => `${percent(row.currentCpuUtilization)} / ${percent(row.targetCpuUtilization)}`,
  },
]

const DB_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: '정상', tone: 'ok' },
  UNAVAILABLE: { label: '중단됨', tone: 'err' },
  UNKNOWN: { label: '확인 불가', tone: 'muted' },
}

// RDS 상태는 종류가 많아(BACKING_UP 등) 모르는 값은 그대로 보여준다.
const dbStatus = (status: string) =>
  DB_STATUS[status] ?? { label: status.toLowerCase().replaceAll('_', ' '), tone: 'info' as BadgeTone }

// 값이 없는 줄은 빼서, 온프렘(Prometheus)에서 비는 항목이 '-'로 늘어서지 않게 한다.
const presentItems = (items: { label: string; value: ReactNode | null }[]) =>
  items.filter((item): item is { label: string; value: ReactNode } => item.value !== null)

function DatabaseBody({ database }: { database: DatabaseStatus }) {
  const status = dbStatus(database.status)
  const storage =
    database.storageUsedGb === null
      ? null
      : database.freeStorageGb === null
        ? `${formatMetric(database.storageUsedGb)}GB 사용`
        : `${formatMetric(database.storageUsedGb)}GB 사용, ${formatMetric(database.freeStorageGb)}GB 남음`

  return (
    <div className="flex flex-col gap-3 px-[18px] py-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        <span className="text-[12.5px] text-muted">{database.source === 'RDS' ? 'AWS RDS' : 'Prometheus (온프레미스)'}</span>
      </div>
      <KeyValueList
        items={presentItems([
          { label: '식별자', value: database.identifier && <span className={mono}>{database.identifier}</span> },
          { label: '엔진', value: database.engine },
          { label: 'Multi-AZ', value: database.multiAz === null ? null : database.multiAz ? '사용' : '사용 안 함' },
          { label: 'CPU', value: database.cpuUsage === null ? null : percent(database.cpuUsage) },
          { label: '연결 수', value: database.connections === null ? null : count(database.connections) },
          { label: '저장 공간', value: storage },
          {
            label: '마지막 백업',
            value: database.lastBackupAt ? formatRelativeTime(database.lastBackupAt) : '기록 없음',
          },
        ])}
      />
    </div>
  )
}

function LoadBalancerBody({ loadBalancer }: { loadBalancer: LoadBalancerStatus }) {
  const hasUnhealthy = loadBalancer.unhealthyTargets > 0

  return (
    <div className="flex flex-col gap-3 px-[18px] py-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={hasUnhealthy ? 'warn' : 'ok'}>
          {hasUnhealthy ? `비정상 대상 ${loadBalancer.unhealthyTargets}개` : '모든 대상 정상'}
        </StatusBadge>
        <span className="text-[12.5px] text-muted">
          {loadBalancer.source === 'ALB' ? 'AWS ALB' : 'Traefik (온프레미스)'}
        </span>
      </div>
      <KeyValueList
        items={presentItems([
          { label: '이름', value: loadBalancer.name && <span className={mono}>{loadBalancer.name}</span> },
          { label: '대상', value: `정상 ${loadBalancer.healthyTargets}, 비정상 ${loadBalancer.unhealthyTargets}` },
          { label: '요청 (5분)', value: loadBalancer.requestCount === null ? null : count(loadBalancer.requestCount) },
          {
            label: '5xx (5분)',
            value:
              loadBalancer.http5xxCount === null ? null : (
                <span className={loadBalancer.http5xxCount > 0 ? 'font-semibold text-err' : ''}>
                  {count(loadBalancer.http5xxCount)}
                </span>
              ),
          },
          {
            label: '평균 응답',
            value: loadBalancer.avgResponseTimeMs === null ? null : `${formatMetric(loadBalancer.avgResponseTimeMs)}ms`,
          },
        ])}
      />
    </div>
  )
}

// 설계서 4.8 인프라 탭: 노드(E2), HPA(E3), DB(E4), 로드밸런서(E5)
function InfraPanels({
  projectId,
  canConnect,
  nodes,
  hpas,
  database,
  loadBalancer,
}: {
  projectId: number
  canConnect: boolean
  nodes: PanelState<{ nodes: K8sNode[] }>
  hpas: PanelState<{ hpas: K8sHpa[] }>
  database: PanelState<DatabaseStatus>
  loadBalancer: PanelState<LoadBalancerStatus>
}) {
  const common = { projectId, canConnect }

  return (
    <>
      <InfraPanel {...common} title="노드" state={nodes} loadingMessage="노드 상태를 불러오는 중입니다." className="mb-5">
        {(data) =>
          data.nodes.length > 0 ? (
            <DataTable columns={NODE_COLUMNS} rows={data.nodes} getRowKey={(row) => row.name} />
          ) : (
            <EmptyState message="수집된 노드가 없어요." />
          )
        }
      </InfraPanel>

      <InfraPanel {...common} title="HPA" state={hpas} loadingMessage="HPA 상태를 불러오는 중입니다." className="mb-5">
        {(data) =>
          data.hpas.length > 0 ? (
            <DataTable columns={HPA_COLUMNS} rows={data.hpas} getRowKey={(row) => row.name} />
          ) : (
            <EmptyState message="이 환경에는 HPA가 없어요." />
          )
        }
      </InfraPanel>

      <div className="grid grid-cols-2 gap-5 max-[1100px]:grid-cols-1">
        <InfraPanel {...common} title="DB" state={database} loadingMessage="DB 상태를 불러오는 중입니다.">
          {(data) => <DatabaseBody database={data} />}
        </InfraPanel>
        <InfraPanel
          {...common}
          title="로드밸런서"
          state={loadBalancer}
          loadingMessage="로드밸런서 상태를 불러오는 중입니다."
        >
          {(data) => <LoadBalancerBody loadBalancer={data} />}
        </InfraPanel>
      </div>
    </>
  )
}

export default InfraPanels
