import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import StatusBadge from '../components/common/StatusBadge'
import CloudSection from '../components/settings/CloudSection'
import RepositorySection from '../components/settings/RepositorySection'
import SettingsSection from '../components/settings/SettingsSection'
import WebhookTokenSection from '../components/settings/WebhookTokenSection'
import { getCloudEnvironments, getWebhookTokens } from '../api/cloudApi'
import { getGithubRepository } from '../api/integrationApi'
import { useAsyncData } from '../hooks/useAsyncData'
import { useProjectContext } from '../hooks/useProjectContext'
import { formatRelativeTime } from '../utils/date'
import { isProjectOwner } from '../utils/projectRole'
import type { WebhookTokenSummary, WebhookTokenType } from '../types/cloud'

type SectionId = 'repository' | 'deployment' | 'cloud' | 'alerts'

const SECTION_IDS: SectionId[] = ['repository', 'deployment', 'cloud', 'alerts']

const isSectionId = (value: string): value is SectionId => SECTION_IDS.includes(value as SectionId)

// 상태 배지: 로딩·오류 중에는 표시하지 않는다.
function ConnectionStatus({ connected, label }: { connected: boolean | null; label?: string }) {
  if (connected === null) return null
  return connected ? (
    <StatusBadge tone="ok">{label ?? '연결됨'}</StatusBadge>
  ) : (
    <StatusBadge tone="muted">연결 안 됨</StatusBadge>
  )
}

// 설계서 4.12 설정: 연결해 두면 각 화면에 데이터가 보이는 항목을 한곳에 모은다.
// 팀원은 읽기 전용이고, 변경·토큰 발급은 OWNER만 한다 (Backend 14.4).
function SettingsContent({ projectId }: { projectId: number }) {
  const location = useLocation()
  const { currentProject, currentUser } = useProjectContext()
  const isOwner = isProjectOwner(currentProject, currentUser?.userId)

  // 다른 화면의 "설정에서 연결하기"는 #cloud처럼 항목을 지정해 들어온다.
  const hashSection = location.hash.slice(1)
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    () => new Set(isSectionId(hashSection) ? [hashSection] : []),
  )

  const [prevHash, setPrevHash] = useState(location.hash)
  if (location.hash !== prevHash) {
    setPrevHash(location.hash)
    if (isSectionId(hashSection)) setOpenSections((prev) => new Set(prev).add(hashSection))
  }

  useEffect(() => {
    if (isSectionId(hashSection)) document.getElementById(hashSection)?.scrollIntoView({ block: 'start' })
  }, [hashSection])

  const toggle = (id: SectionId) =>
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const repository = useAsyncData(
    () => getGithubRepository(projectId).then((response) => response.data.data ?? null),
    `settings-github-${projectId}`,
    '저장소 정보를 불러오지 못했습니다.',
  )

  const environments = useAsyncData(
    () => getCloudEnvironments(projectId).then((response) => response.data.data ?? []),
    `settings-cloud-${projectId}`,
    '환경 목록을 불러오지 못했습니다.',
  )

  // WT1은 OWNER 전용이라 팀원은 조회하지 않는다.
  const tokens = useAsyncData(
    () => getWebhookTokens(projectId).then((response) => response.data.data ?? []),
    isOwner ? `settings-tokens-${projectId}` : null,
    '토큰 정보를 불러오지 못했습니다.',
  )

  const isReady = (state: { isLoading: boolean; error: string; data: unknown }) =>
    !state.error && !(state.isLoading && state.data === null)

  const tokenOf = (type: WebhookTokenType): WebhookTokenSummary | null =>
    tokens.data?.find((token) => token.type === type) ?? null

  const tokenStatus = (type: WebhookTokenType) => {
    if (!isOwner || !isReady(tokens)) return null
    const token = tokenOf(type)
    if (!token) return <ConnectionStatus connected={false} />
    return token.lastUsedAt ? (
      <StatusBadge tone="ok">최근 사용 {formatRelativeTime(token.lastUsedAt)}</StatusBadge>
    ) : (
      <StatusBadge tone="info">토큰 발급됨</StatusBadge>
    )
  }

  const environmentCount = environments.data?.length ?? 0
  const origin = window.location.origin

  const tokenProps = {
    projectId,
    isLoading: tokens.isLoading,
    error: tokens.error,
    onRetry: tokens.reload,
    onIssued: tokens.reload,
    canEdit: isOwner,
  }

  return (
    <>
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.02em]">설정</h1>
        <p className="mt-1 text-[13px] text-muted">
          연결해 두면 CI/CD와 모니터링 화면에 데이터가 보여요.
          {!isOwner && ' 연결은 프로젝트 소유자만 바꿀 수 있어요.'}
        </p>
      </div>

      <ul className="overflow-hidden rounded-xl border border-line bg-panel shadow-panel">
        <SettingsSection
          id="repository"
          title="저장소"
          description="GitHub 저장소를 연결하면 CI/CD 화면에 파이프라인이 보여요."
          status={
            <ConnectionStatus connected={isReady(repository) ? repository.data !== null : null} />
          }
          isOpen={openSections.has('repository')}
          onToggle={() => toggle('repository')}
        >
          <RepositorySection
            projectId={projectId}
            repository={repository.data}
            isLoading={repository.isLoading}
            error={repository.error}
            onRetry={repository.reload}
            onConnected={repository.reload}
            canEdit={isOwner}
          />
        </SettingsSection>

        <SettingsSection
          id="deployment"
          title="배포 기록"
          description="CI의 배포 단계가 DevFlow에 알려 주면 CI/CD와 대시보드에 배포 이력이 보여요."
          status={tokenStatus('deployment')}
          isOpen={openSections.has('deployment')}
          onToggle={() => toggle('deployment')}
        >
          <WebhookTokenSection
            {...tokenProps}
            type="deployment"
            token={tokenOf('deployment')}
            usage={`curl -X POST ${origin}/api/webhooks/deployments \\
  -H "Authorization: Bearer $DEVFLOW_DEPLOY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"environment":"dev","service":"backend","commitSha":"'$GITHUB_SHA'","imageTag":"v1.0.0","status":"SUCCESS"}'`}
          />
        </SettingsSection>

        <SettingsSection
          id="cloud"
          title="클라우드"
          description="Prometheus와 AWS를 연결하면 모니터링 화면에 배포 상태, 파드, 지표가 보여요."
          status={
            <ConnectionStatus
              connected={isReady(environments) ? environmentCount > 0 : null}
              label={`환경 ${environmentCount}개`}
            />
          }
          isOpen={openSections.has('cloud')}
          onToggle={() => toggle('cloud')}
        >
          <CloudSection
            projectId={projectId}
            environments={environments.data}
            isLoading={environments.isLoading}
            error={environments.error}
            onRetry={environments.reload}
            onChanged={environments.reload}
            canEdit={isOwner}
          />
        </SettingsSection>

        <SettingsSection
          id="alerts"
          title="장애 알림"
          description="Alertmanager가 알림을 보내면 모니터링과 전체 장애 화면에 장애로 쌓여요."
          status={tokenStatus('alertmanager')}
          isOpen={openSections.has('alerts')}
          onToggle={() => toggle('alerts')}
        >
          <WebhookTokenSection
            {...tokenProps}
            type="alertmanager"
            token={tokenOf('alertmanager')}
            usage={`# alertmanager.yml
receivers:
  - name: devflow
    webhook_configs:
      - url: ${origin}/api/webhooks/alertmanager
        send_resolved: true
        http_config:
          authorization:
            credentials: <발급한 토큰>`}
          />
        </SettingsSection>
      </ul>
    </>
  )
}

// 프로젝트가 바뀌면 펼친 항목과 발급한 토큰 표시를 새로 시작한다.
function SettingsPage() {
  const params = useParams()
  const projectId = params.projectId ? Number(params.projectId) : null

  if (projectId === null || Number.isNaN(projectId)) {
    return null
  }

  return <SettingsContent key={projectId} projectId={projectId} />
}

export default SettingsPage
