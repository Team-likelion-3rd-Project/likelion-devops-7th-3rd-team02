import { useState } from 'react'

import CloudEnvironmentModal from './CloudEnvironmentModal'
import CopyButton from '../common/CopyButton'
import KeyValueList from '../common/KeyValueList'
import Modal from '../common/Modal'
import StatusBadge from '../common/StatusBadge'
import { FormError } from '../common/FormField'
import { ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, dangerButtonClass, primaryButtonClass } from '../common/styles'
import { deleteCloudEnvironment, testCloudEnvironment } from '../../api/cloudApi'
import { formatClock } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import type { BadgeTone } from '../common/StatusBadge'
import type { CloudCheckResult, CloudCheckStatus, CloudEnvironment, CloudTestResponse } from '../../types/cloud'

const mono = 'font-mono text-[12.5px]'

const CHECK_STATUS: Record<CloudCheckStatus, { label: string; tone: BadgeTone }> = {
  OK: { label: '정상', tone: 'ok' },
  FAILED: { label: '실패', tone: 'err' },
  NOT_CONFIGURED: { label: '설정 안 함', tone: 'muted' },
}

function CheckRow({ name, result }: { name: string; result: CloudCheckResult }) {
  const meta = CHECK_STATUS[result.status]

  return (
    <li className="flex flex-wrap items-center gap-2">
      <span className="w-[86px] flex-none text-muted">{name}</span>
      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
      {result.message && <span className="min-w-0 text-[12.5px] break-keep text-muted">{result.message}</span>}
    </li>
  )
}

function TrustValue({ value }: { value: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-2">
      <span title={value} className={`min-w-0 truncate ${mono}`}>
        {value}
      </span>
      <CopyButton value={value} />
    </span>
  )
}

// 환경 하나: 연결 정보 요약, OWNER는 연결 확인(CL5)·수정(CL3)·삭제(CL4)
function EnvironmentItem({
  projectId,
  environment,
  canEdit,
  onEdit,
  onDelete,
}: {
  projectId: number
  environment: CloudEnvironment
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [test, setTest] = useState<CloudTestResponse | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [testError, setTestError] = useState('')

  const runTest = async () => {
    setIsTesting(true)
    setTestError('')

    try {
      const response = await testCloudEnvironment(projectId, environment.id)
      setTest(response.data.data)
    } catch (error) {
      setTestError(getErrorMessage(error, '연결을 확인하지 못했습니다.'))
    } finally {
      setIsTesting(false)
    }
  }

  const { prometheus, kubernetes, aws, awsTrust } = environment
  const kubernetesTarget = [kubernetes?.namespace, kubernetes?.appDeployment].filter(Boolean).join(' / ')

  // 입력한 값은 모두 여기서 보이게 한다. 비운 칸은 Backend 기본값을 쓰므로 표시하지 않는다.
  const detailLines = (lines: [string, string | null | undefined][]) =>
    lines.flatMap(([name, value]) =>
      value
        ? [
            <span key={name} title={value} className={`block truncate ${mono}`}>
              <span className="font-sans text-muted">{name} </span>
              {value}
            </span>,
          ]
        : [],
    )

  const kubernetesDetails = detailLines([
    ['지표 job', kubernetes?.metricsJob],
    ['노드 라벨', kubernetes?.nodeLabel],
  ])
  const awsDetails = detailLines([
    ['RDS', aws?.rdsInstanceId],
    ['로드밸런서', aws?.loadBalancerArn],
    ['대상 그룹', aws?.targetGroupArn],
  ])

  return (
    <li className="flex flex-col gap-3.5 rounded-[10px] border border-line px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <b title={environment.label} className="min-w-0 truncate font-semibold">
          {environment.label}
        </b>
        <span className={`text-muted ${mono}`}>{environment.name}</span>
        {environment.isDefault && <StatusBadge tone="info" plain>기본</StatusBadge>}
      </div>

      <KeyValueList
        items={[
          {
            label: 'Prometheus',
            value: prometheus ? (
              <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                <span title={prometheus.url} className={`min-w-0 truncate ${mono}`}>
                  {prometheus.url}
                </span>
                {prometheus.hasToken && <span className="text-[12.5px] text-muted">토큰 있음</span>}
              </span>
            ) : (
              <span className="text-muted">연결 안 됨</span>
            ),
          },
          {
            label: 'Kubernetes',
            value: (
              <>
                {kubernetesTarget ? (
                  <span title={kubernetesTarget} className={`block truncate ${mono}`}>
                    {kubernetesTarget}
                  </span>
                ) : (
                  <span className="text-muted">대상 앱 지정 안 함</span>
                )}
                {kubernetesDetails}
              </>
            ),
          },
          {
            label: 'AWS',
            value: aws ? (
              <>
                <span title={aws.roleArn} className={`block truncate ${mono}`}>
                  {aws.region} / {aws.roleArn}
                </span>
                {awsDetails}
              </>
            ) : (
              <span className="text-muted">사용 안 함</span>
            ),
          },
        ]}
      />

      {/* AWS 역할 신뢰 정책에 넣을 값. 역할을 만드는 OWNER에게만 보여준다. */}
      {canEdit && (
        <details className="group text-[13px]">
          <summary className="cursor-pointer font-medium text-accent">AWS 역할 신뢰 정책에 넣을 값</summary>
          <div className="mt-2.5 flex flex-col gap-2.5">
            <p className="text-muted break-keep">
              AWS 계정에 읽기 전용 역할을 만들고, 신뢰 정책에 아래 주체와 ExternalId를 넣어 주세요. 접근 키는 받지 않아요.
            </p>
            <KeyValueList
              items={[
                {
                  label: '주체 ARN',
                  value: awsTrust.principalArn ? (
                    <TrustValue value={awsTrust.principalArn} />
                  ) : (
                    <span className="text-muted">서버에 설정되지 않았어요. 운영 담당에게 문의하세요.</span>
                  ),
                },
                { label: 'ExternalId', value: <TrustValue value={awsTrust.externalId} /> },
              ]}
            />
          </div>
        </details>
      )}

      {test && (
        <div className="flex flex-col gap-2 rounded-lg bg-page px-3 py-2.5 text-[13px]">
          <span className="text-[12.5px] text-muted">연결 확인 {formatClock(test.checkedAt)}</span>
          <ul className="flex flex-col gap-1.5">
            <CheckRow name="Prometheus" result={test.prometheus} />
            <CheckRow name="AWS" result={test.aws} />
          </ul>
        </div>
      )}
      <FormError message={testError} />

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={runTest} disabled={isTesting} className={buttonClass}>
            {isTesting ? '확인 중...' : '연결 확인'}
          </button>
          <button type="button" onClick={onEdit} className={buttonClass}>
            수정
          </button>
          <button type="button" onClick={onDelete} className={buttonClass}>
            삭제
          </button>
        </div>
      )}
    </li>
  )
}

// 설정 > 클라우드: 프로젝트 환경 목록(CL1, 팀원 조회) + 등록·수정·삭제(OWNER)
function CloudSection({
  projectId,
  environments,
  isLoading,
  error,
  onRetry,
  onChanged,
  canEdit,
}: {
  projectId: number
  environments: CloudEnvironment[] | null
  isLoading: boolean
  error: string
  onRetry: () => void
  onChanged: () => void
  canEdit: boolean
}) {
  // undefined: 닫힘, null: 새 환경, 객체: 수정
  const [editing, setEditing] = useState<CloudEnvironment | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<CloudEnvironment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (error) return <ErrorMessage message={error} onRetry={onRetry} />
  if (isLoading && environments === null) return <Loading message="환경 목록을 불러오는 중입니다." />

  const list = environments ?? []

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    setDeleteError('')

    try {
      await deleteCloudEnvironment(projectId, deleting.id)
      setDeleting(null)
      onChanged()
    } catch (error) {
      setDeleteError(getErrorMessage(error, '환경을 삭제하지 못했습니다.'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {list.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {list.map((environment) => (
            <EnvironmentItem
              key={environment.id}
              projectId={projectId}
              environment={environment}
              canEdit={canEdit}
              onEdit={() => setEditing(environment)}
              onDelete={() => {
                setDeleteError('')
                setDeleting(environment)
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">
          아직 연결한 환경이 없어요.{!canEdit && ' 연결은 프로젝트 소유자가 할 수 있어요.'}
        </p>
      )}

      {canEdit && (
        <div>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className={list.length > 0 ? buttonClass : primaryButtonClass}
          >
            환경 추가
          </button>
        </div>
      )}

      {editing !== undefined && (
        <CloudEnvironmentModal
          projectId={projectId}
          environment={editing}
          isFirst={list.length === 0}
          onSaved={onChanged}
          onClose={() => setEditing(undefined)}
        />
      )}

      {deleting && (
        <Modal
          title={`${deleting.label} 환경을 삭제할까요?`}
          description="삭제하면 이 환경의 운영 상태를 더 볼 수 없어요. 배포 기록과 장애 기록은 남아요."
          onClose={() => setDeleting(null)}
          maxWidth="max-w-[460px]"
          footer={
            <>
              <button type="button" onClick={() => setDeleting(null)} className={buttonClass}>
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={dangerButtonClass}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </>
          }
        >
          <FormError message={deleteError} />
        </Modal>
      )}
    </>
  )
}

export default CloudSection
