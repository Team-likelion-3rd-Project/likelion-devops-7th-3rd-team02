import type { BadgeTone } from '../components/common/StatusBadge'
import type { DeploymentStatus, HealthStatus } from '../types/deployment'
import type { EnvironmentHealth, EnvironmentReason } from '../types/environment'
import type { IncidentSeverity, IncidentStatus } from '../types/incident'
import type { PipelineStageName, PipelineStatus } from '../types/pipeline'
import type { TaskStatus } from '../types/task'

interface StatusMeta {
  label: string
  tone: BadgeTone
}

// 시안 표기: 할 일 / 진행 중 / 완료
export const TASK_STATUS: Record<TaskStatus, StatusMeta> = {
  TODO: { label: '할 일', tone: 'muted' },
  IN_PROGRESS: { label: '진행 중', tone: 'info' },
  DONE: { label: '완료', tone: 'ok' },
}

// 시안 표기: 성공 / 실패. 상태 값은 Backend 확정 전 가정 (types/deployment.ts)
export const DEPLOYMENT_STATUS: Record<DeploymentStatus, StatusMeta> = {
  SUCCESS: { label: '성공', tone: 'ok' },
  FAILED: { label: '실패', tone: 'err' },
  IN_PROGRESS: { label: '배포 중', tone: 'info' },
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE']

// 현재 배포 패널 표기 (시안: 정상 실행 중)
export const CURRENT_DEPLOYMENT_STATUS: Record<DeploymentStatus, StatusMeta> = {
  SUCCESS: { label: '정상 실행 중', tone: 'ok' },
  FAILED: { label: '실패', tone: 'err' },
  IN_PROGRESS: { label: '배포 중', tone: 'info' },
}

// 실행 중인 애플리케이션 상태 (시안: 정상 실행 중). 최신 배포의 health
export const HEALTH_STATUS: Record<HealthStatus, StatusMeta> = {
  HEALTHY: { label: '정상 실행 중', tone: 'ok' },
  DEGRADED: { label: '일부 이상', tone: 'warn' },
  DOWN: { label: '중단됨', tone: 'err' },
}

// 환경 상태 (E1). HEALTHY·DEGRADED·DOWN은 실행 상태와 같은 말을 쓴다.
export const ENVIRONMENT_HEALTH: Record<EnvironmentHealth, StatusMeta> = {
  ...HEALTH_STATUS,
  UNKNOWN: { label: '확인 불가', tone: 'muted' },
}

// 확인 불가인 이유 (E1 reason)
export const ENVIRONMENT_REASON: Record<EnvironmentReason, string> = {
  NOT_CONNECTED: 'Prometheus가 연결되지 않았어요.',
  UNREACHABLE: 'Prometheus에 연결할 수 없어요.',
  NOT_DEPLOYED: '아직 배포 기록이 없어요.',
}

// 파이프라인 상태 (시안 이력 표: 진행 중 / 성공 / 실패). 상태 값은 확정 전 가정 (types/pipeline.ts)
export const PIPELINE_STATUS: Record<PipelineStatus, StatusMeta> = {
  RUNNING: { label: '진행 중', tone: 'info' },
  SUCCESS: { label: '성공', tone: 'ok' },
  FAILED: { label: '실패', tone: 'err' },
  PENDING: { label: '대기', tone: 'muted' },
}

export const PIPELINE_STAGES: { name: PipelineStageName; label: string; runningLabel: string }[] = [
  { name: 'BUILD', label: 'Build', runningLabel: '빌드 중' },
  { name: 'TEST', label: 'Test', runningLabel: '테스트 중' },
  { name: 'IMAGE', label: 'Image', runningLabel: '이미지 생성 중' },
  { name: 'VERIFY', label: 'Verify', runningLabel: '검증 중' },
  { name: 'DEPLOY', label: 'Deploy', runningLabel: '배포 중' },
]

// 장애 상태: 모니터링과 전체 장애가 같은 말을 쓴다 (설계서 4.8, 4.11)
export const INCIDENT_STATUS: Record<IncidentStatus, StatusMeta> = {
  OPEN: { label: '확인 필요', tone: 'warn' },
  ACKNOWLEDGED: { label: '해결 중', tone: 'info' },
  RESOLVED: { label: '해결됨', tone: 'ok' },
}

// 장애 심각도 (시안: 경고, 긴급). 값은 확정 전 가정 (types/incident.ts)
export const INCIDENT_SEVERITY: Record<IncidentSeverity, StatusMeta> = {
  CRITICAL: { label: '긴급', tone: 'err' },
  WARNING: { label: '경고', tone: 'warn' },
  INFO: { label: '정보', tone: 'info' },
}

// 파드 상태는 Kubernetes 표기를 그대로 보여주고 색만 나눈다.
export const podStatusTone = (status: string): BadgeTone => {
  if (status === 'Running' || status === 'Succeeded') return 'ok'
  if (status === 'Pending' || status === 'ContainerCreating') return 'warn'
  if (status === 'Unknown') return 'muted'
  return 'err'
}
