import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { fetchMockDeploymentPage, fetchMockPipelines } from './cicd'
import { fetchMockIncidents } from './dashboard'
import { fetchMockK8sDeployments, fetchMockK8sPods, fetchMockMonitoringSummary } from './monitoring'
import type { CloudEnvironment, WebhookTokenSummary, WebhookTokenType } from '../types/cloud'
import type { Incident } from '../types/incident'
import type { GithubRepository } from '../types/integration'
import type { ProjectMember } from '../types/member'
import type { MonitoringRange } from '../types/monitoring'
import type { ProjectListItem, ProjectRole } from '../types/project'
import type { Task, TaskStatus } from '../types/task'
import type { UserMe } from '../types/user'

// 목 모드 (npm run dev:mock) 전용 가짜 API. 브라우저 메모리에만 있고 새로고침하면 처음 상태로 돌아간다.
// 실제 배포 빌드에는 포함되지 않는다 (api/axios.ts에서 mock 모드일 때만 불러온다).

class MockHttpError extends Error {
  status: number
  code: string

  constructor(status: number, message: string, code = 'MOCK_ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

const now = () => new Date().toISOString()
const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60 * 1000).toISOString()

// ---------- 메모리 DB ----------

const users: (UserMe & { password: string })[] = [
  { userId: 1, email: 'jimin@example.com', name: '이지민', password: 'password' },
  { userId: 2, email: 'minho@example.com', name: '김민호', password: 'password' },
  { userId: 3, email: 'soyeon@example.com', name: '박소연', password: 'password' },
]

let currentUserId = 1

const projects: (Omit<ProjectListItem, 'role'> & { updatedAt: string })[] = [
  { id: 1, name: 'DevFlow 서비스', description: '팀 작업과 배포 상태를 함께 보는 프로젝트', ownerId: 2, ownerName: '김민호', createdAt: at(60 * 24 * 7), updatedAt: at(30) },
  { id: 2, name: '사내 위키 이전', description: '기존 위키 문서를 새 위키로 옮기는 작업', ownerId: 1, ownerName: '이지민', createdAt: at(60 * 24 * 3), updatedAt: at(60 * 5) },
]

const memberships: { projectId: number; userId: number; role: ProjectRole }[] = [
  { projectId: 1, userId: 2, role: 'OWNER' },
  { projectId: 1, userId: 1, role: 'MEMBER' },
  { projectId: 1, userId: 3, role: 'MEMBER' },
  { projectId: 2, userId: 1, role: 'OWNER' },
]

const task = (
  id: number,
  projectId: number,
  title: string,
  status: TaskStatus,
  assigneeId: number | null,
  minutesAgo: number,
  extra: Partial<Task> = {},
): Task => ({
  id,
  projectId,
  title,
  description: null,
  status,
  assigneeId,
  assigneeName: users.find((user) => user.userId === assigneeId)?.name ?? null,
  createdAt: at(minutesAgo + 60),
  updatedAt: at(minutesAgo),
  ...extra,
})

const tasks: Task[] = [
  task(51, 1, '프로젝트 생성 시 저장소 연결', 'TODO', 1, 40),
  task(53, 1, '배포 이력 페이지네이션', 'TODO', 1, 90),
  task(55, 1, '모니터링 추이 차트', 'TODO', 3, 130),
  task(47, 1, '작업 목록 검색과 필터', 'IN_PROGRESS', 1, 20),
  task(49, 1, 'K8s 파드 상태 API 연동', 'IN_PROGRESS', 2, 60),
  task(52, 1, '장애 확인과 담당자 지정', 'IN_PROGRESS', 3, 75),
  task(42, 1, '로그인 세션 만료 처리', 'DONE', 1, 10, {
    description: '토큰이 만료되면 로그인 화면으로 보내고, 만료 안내를 한 번만 보여줍니다.',
  }),
  task(44, 1, '파이프라인 단계 표시', 'DONE', 2, 200),
  task(40, 1, 'GitHub 로그인', 'DONE', 3, 400),
  task(60, 1, '팀 회의록 정리', 'TODO', null, 300),
  task(61, 2, '기존 문서 목록 추출', 'IN_PROGRESS', 1, 50),
]

let nextTaskId = 100
let nextProjectId = 10

const githubRepos: Record<number, GithubRepository | null> = {
  1: { fullName: 'team02/devflow', url: 'https://github.com/team02/devflow' },
}
// 배포 기록(D3 Webhook)을 받은 프로젝트
const deployedProjectIds = new Set([1])

const incidentsByProject: Record<number, Incident[]> = {}

// 클라우드 환경 (CL1). 프로젝트 1: dev(Prometheus 연결) + production(AWS만), 프로젝트 2: 없음
const MOCK_PRINCIPAL_ARN = 'arn:aws:iam::111122223333:role/devflow-backend'
let nextEnvironmentId = 10

const cloudEnvironments: Record<number, CloudEnvironment[]> = {
  1: [
    {
      id: 1, name: 'dev', label: '온프레미스 (kubeadm)', isDefault: true,
      prometheus: { url: 'http://prometheus.monitoring.svc:9090', hasToken: false },
      kubernetes: { namespace: 'devflow', appDeployment: 'backend', metricsJob: 'backend', nodeLabel: 'node' },
      aws: null,
      awsTrust: { principalArn: MOCK_PRINCIPAL_ARN, externalId: 'devflow-7Kq2mX9pLw' },
      createdAt: at(60 * 24 * 3), updatedAt: at(60 * 24 * 3),
    },
    {
      id: 2, name: 'production', label: 'AWS', isDefault: false,
      prometheus: null,
      kubernetes: { namespace: 'devflow', appDeployment: 'backend', metricsJob: null, nodeLabel: null },
      aws: {
        region: 'ap-northeast-2', roleArn: 'arn:aws:iam::123456789012:role/devflow-readonly',
        rdsInstanceId: 'devflow-db', loadBalancerArn: null, targetGroupArn: null,
      },
      awsTrust: { principalArn: MOCK_PRINCIPAL_ARN, externalId: 'devflow-Hn4vQ2rT8s' },
      createdAt: at(60 * 24 * 2), updatedAt: at(60 * 24 * 2),
    },
  ],
}

// Webhook 토큰 (WT1). 원문은 발급할 때만 돌려준다.
const webhookTokens: Record<number, WebhookTokenSummary[]> = {
  1: [{ type: 'deployment', createdAt: at(60 * 24 * 2), lastUsedAt: at(5) }],
}

// ---------- 헬퍼 ----------

const findProject = (projectId: number) => {
  const project = projects.find((item) => item.id === projectId)
  if (!project) throw new MockHttpError(404, '프로젝트를 찾을 수 없습니다.', 'PROJECT_NOT_FOUND')
  return project
}

const roleOf = (projectId: number, userId: number) =>
  memberships.find((item) => item.projectId === projectId && item.userId === userId)?.role ?? null

const toProjectItem = (project: (typeof projects)[number]): ProjectListItem & { updatedAt: string } => ({
  ...project,
  role: roleOf(project.id, currentUserId) ?? undefined,
})

const requireOwner = (projectId: number) => {
  if (roleOf(projectId, currentUserId) !== 'OWNER') {
    throw new MockHttpError(403, '프로젝트 소유자만 할 수 있습니다.', 'FORBIDDEN')
  }
}

const environmentsOf = (projectId: number) => (cloudEnvironments[projectId] ??= [])

const findEnvironment = (projectId: number, environmentId: number) => {
  const found = environmentsOf(projectId).find((item) => item.id === environmentId)
  if (!found) throw new MockHttpError(404, '환경을 찾을 수 없습니다.', 'ENVIRONMENT_NOT_FOUND')
  return found
}

// 기본 환경이 먼저, 그다음 등록순 (CL1)
const sortEnvironments = (projectId: number) =>
  environmentsOf(projectId).sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id)

// CL2·CL3 요청을 저장 형태로. 토큰은 생략하면 유지, ""이면 삭제 (Backend 14.1)
const applyEnvironment = (projectId: number, target: CloudEnvironment, body: Body) => {
  const name = String(body.name ?? '')
  if (!/^[a-z0-9][a-z0-9-]{0,29}$/.test(name)) {
    throw new MockHttpError(400, '환경 이름은 영문 소문자·숫자·-로 1~30자여야 합니다.', 'INVALID_REQUEST')
  }
  if (environmentsOf(projectId).some((item) => item.name === name && item.id !== target.id)) {
    throw new MockHttpError(409, '이미 같은 이름의 환경이 있습니다.', 'DUPLICATE_ENVIRONMENT')
  }
  const prometheus = body.prometheus as { url: string; token?: string } | null
  const aws = body.aws as CloudEnvironment['aws']
  if (aws && !/^arn:aws[a-z-]*:iam::\d{12}:role\/.+$/.test(aws.roleArn)) {
    throw new MockHttpError(400, '역할 ARN 형식이 올바르지 않습니다.', 'INVALID_REQUEST')
  }
  const hadToken = target.prometheus?.hasToken ?? false
  target.name = name
  target.label = (body.label as string) || name
  target.prometheus = prometheus
    ? { url: prometheus.url, hasToken: prometheus.token === undefined ? hadToken : prometheus.token !== '' }
    : null
  target.kubernetes = (body.kubernetes as CloudEnvironment['kubernetes']) ?? null
  target.aws = aws ?? null
  target.updatedAt = now()
  if (body.isDefault === true) environmentsOf(projectId).forEach((item) => (item.isDefault = item.id === target.id))
  if (body.isDefault === false) target.isDefault = false
}

const ensureDefault = (projectId: number) => {
  const list = environmentsOf(projectId)
  if (list.length > 0 && !list.some((item) => item.isDefault)) {
    list.reduce((first, item) => (item.id < first.id ? item : first)).isDefault = true
  }
}

// K1·K2·O1: env 생략 시 기본 환경, 환경이 없거나 Prometheus가 없으면 404 CLOUD_NOT_CONNECTED (Backend 14.2)
const requirePrometheus = (projectId: number, env: string | undefined) => {
  const list = environmentsOf(projectId)
  if (list.length === 0) {
    throw new MockHttpError(404, '클라우드 환경이 연결되지 않았습니다. 프로젝트 설정에서 연결해 주세요.', 'CLOUD_NOT_CONNECTED')
  }
  const target = env ? list.find((item) => item.name === env) : (list.find((item) => item.isDefault) ?? list[0])
  if (!target) throw new MockHttpError(404, '환경을 찾을 수 없습니다.', 'ENVIRONMENT_NOT_FOUND')
  if (!target.prometheus) {
    throw new MockHttpError(404, `'${target.name}' 환경에 Prometheus가 연결되지 않았습니다. 프로젝트 설정에서 연결해 주세요.`, 'CLOUD_NOT_CONNECTED')
  }
}

// E4·E5: AWS가 있으면 AWS, 없으면 Prometheus, 둘 다 없으면 404 CLOUD_NOT_CONNECTED (Backend 14.2)
const requireAwsOrPrometheus = (projectId: number, env: string | undefined) => {
  const list = environmentsOf(projectId)
  if (list.length === 0) {
    throw new MockHttpError(404, '클라우드 환경이 연결되지 않았습니다. 프로젝트 설정에서 연결해 주세요.', 'CLOUD_NOT_CONNECTED')
  }
  const target = env ? list.find((item) => item.name === env) : (list.find((item) => item.isDefault) ?? list[0])
  if (!target) throw new MockHttpError(404, '환경을 찾을 수 없습니다.', 'ENVIRONMENT_NOT_FOUND')
  if (!target.aws && !target.prometheus) {
    throw new MockHttpError(404, `'${target.name}' 환경에 AWS나 Prometheus가 연결되지 않았습니다. 프로젝트 설정에서 연결해 주세요.`, 'CLOUD_NOT_CONNECTED')
  }
  return target
}

const issueToken = (projectId: number, type: WebhookTokenType) => {
  requireOwner(projectId)
  const list = (webhookTokens[projectId] ??= [])
  const createdAt = now()
  const existing = list.find((item) => item.type === type)
  if (existing) Object.assign(existing, { createdAt, lastUsedAt: null })
  else list.push({ type, createdAt, lastUsedAt: null })
  const random = Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join('')
  return { type, token: `dfw_${random}`, createdAt }
}

const membersOf = (projectId: number): ProjectMember[] =>
  memberships
    .filter((item) => item.projectId === projectId)
    .map((item, index) => {
      const user = users.find((u) => u.userId === item.userId)!
      return { memberId: projectId * 100 + index, userId: user.userId, email: user.email, name: user.name, role: item.role }
    })

// sort 허용 값: updatedAt,desc(기본) / createdAt,desc / title,asc
const compareTasks = (sort = 'updatedAt,desc') => (a: Task, b: Task) => {
  if (sort === 'title,asc') return a.title.localeCompare(b.title, 'ko')
  if (sort === 'createdAt,desc') return b.createdAt.localeCompare(a.createdAt)
  return b.updatedAt.localeCompare(a.updatedAt)
}

const findTask = (projectId: number, taskId: number) => {
  const found = tasks.find((item) => item.id === taskId && item.projectId === projectId)
  if (!found) throw new MockHttpError(404, '업무를 찾을 수 없습니다.', 'TASK_NOT_FOUND')
  return found
}

const incidentsOf = async (projectId: number) => {
  if (!incidentsByProject[projectId]) {
    incidentsByProject[projectId] =
      projectId === 1
        ? await fetchMockIncidents()
        : projectId === 2
          ? [{
              id: 21, projectId: 2, projectName: findProject(2).name,
              title: '위키 검색 응답 시간이 기준을 넘고 있습니다.', status: 'OPEN', severity: 'WARNING',
              occurredAt: at(25), source: 'Alertmanager', assigneeId: null,
              metric: { currentValue: 2.4, threshold: 1.5, unit: 's' }, firing: true,
            }]
          : []
  }
  return incidentsByProject[projectId]
}

// ---------- 라우트 ----------

type Body = Record<string, unknown>
type Handler = (ctx: { params: Record<string, number>; query: Record<string, string>; body: Body }) => unknown

const routes: [string, string, Handler][] = [
  // 인증
  ['post', '/auth/login', ({ body }) => {
    const user = users.find((item) => item.email === body.email)
    if (!user || user.password !== body.password) {
      throw new MockHttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.', 'INVALID_LOGIN')
    }
    currentUserId = user.userId
    return { accessToken: `mock-token-${user.userId}`, tokenType: 'Bearer' }
  }],
  ['post', '/auth/signup', ({ body }) => {
    if (users.some((item) => item.email === body.email)) {
      throw new MockHttpError(409, '이미 사용 중인 이메일입니다.', 'DUPLICATE_EMAIL')
    }
    const user = { userId: users.length + 1, email: String(body.email), name: String(body.name), password: String(body.password) }
    users.push(user)
    return { userId: user.userId, email: user.email, name: user.name }
  }],
  // X3: 목 모드는 버튼이 code=mock-{provider}로 바로 돌아온다. github는 이지민, 그 외는 실패
  ['post', '/auth/oauth/token', ({ body }) => {
    if (body.code !== 'mock-github') {
      throw new MockHttpError(400, '로그인 시간이 지났어요. 다시 로그인해 주세요.', 'INVALID_OAUTH_CODE')
    }
    currentUserId = 1
    return { accessToken: 'mock-token-1', tokenType: 'Bearer' }
  }],
  ['get', '/users/me', () => {
    const { password: _password, ...user } = users.find((item) => item.userId === currentUserId)!
    void _password
    return user
  }],

  // 프로젝트·팀원
  ['get', '/projects', () =>
    projects.filter((project) => roleOf(project.id, currentUserId)).map(toProjectItem)],
  ['post', '/projects', ({ body }) => {
    const me = users.find((item) => item.userId === currentUserId)!
    const project = { id: nextProjectId++, name: String(body.name), description: (body.description as string) || null, ownerId: me.userId, ownerName: me.name, createdAt: now(), updatedAt: now() }
    projects.unshift(project)
    memberships.push({ projectId: project.id, userId: me.userId, role: 'OWNER' })
    return toProjectItem(project)
  }],
  ['get', '/projects/:projectId', ({ params }) => toProjectItem(findProject(params.projectId))],
  ['get', '/projects/:projectId/members', ({ params }) => membersOf(params.projectId)],
  ['post', '/projects/:projectId/members', ({ params, body }) => {
    if (roleOf(params.projectId, currentUserId) !== 'OWNER') {
      throw new MockHttpError(403, '팀원을 등록할 권한이 없습니다.', 'FORBIDDEN')
    }
    const user = users.find((item) => item.email === body.email)
    if (!user) throw new MockHttpError(404, '해당 이메일의 사용자가 없습니다.', 'USER_NOT_FOUND')
    if (roleOf(params.projectId, user.userId)) throw new MockHttpError(409, '이미 프로젝트 팀원입니다.', 'DUPLICATE_MEMBER')
    memberships.push({ projectId: params.projectId, userId: user.userId, role: 'MEMBER' })
    return membersOf(params.projectId).find((member) => member.userId === user.userId)
  }],

  // 업무
  ['get', '/projects/:projectId/tasks', ({ params, query }) => {
    findProject(params.projectId)
    const page = Number(query.page ?? 0)
    const size = Number(query.size ?? 1000)
    // statusCounts는 status 조건만 빼고 센다 (Backend 확정)
    const matched = tasks
      .filter((item) => item.projectId === params.projectId)
      .filter((item) => !query.keyword || item.title.includes(query.keyword))
      .filter((item) => !query.assigneeId || item.assigneeId === Number(query.assigneeId))
    const statusCounts: Record<TaskStatus, number> = { TODO: 0, IN_PROGRESS: 0, DONE: 0 }
    matched.forEach((item) => { statusCounts[item.status] += 1 })
    const filtered = matched
      .filter((item) => !query.status || item.status === query.status)
      .sort(compareTasks(query.sort))
    return { tasks: filtered.slice(page * size, page * size + size), totalCount: filtered.length, statusCounts }
  }],
  ['post', '/projects/:projectId/tasks', ({ params, body }) => {
    const assigneeId = (body.assigneeId as number | null) ?? null
    const created = task(nextTaskId++, params.projectId, String(body.title), 'TODO', assigneeId, 0, {
      description: (body.description as string) || null,
    })
    tasks.push(created)
    return created
  }],
  ['patch', '/projects/:projectId/tasks/:taskId', ({ params, body }) => {
    const found = findTask(params.projectId, params.taskId)
    Object.assign(found, { title: body.title, description: (body.description as string) || null, updatedAt: now() })
    return found
  }],
  ['patch', '/projects/:projectId/tasks/:taskId/status', ({ params, body }) => {
    const found = findTask(params.projectId, params.taskId)
    Object.assign(found, { status: body.status, updatedAt: now() })
    return found
  }],
  ['patch', '/projects/:projectId/tasks/:taskId/assignee', ({ params, body }) => {
    const found = findTask(params.projectId, params.taskId)
    // null이면 담당자 해제 (T6)
    const assigneeId = body.assigneeId === null ? null : Number(body.assigneeId)
    Object.assign(found, {
      assigneeId,
      assigneeName: users.find((user) => user.userId === assigneeId)?.name ?? null,
      updatedAt: now(),
    })
    return found
  }],
  // T7: OWNER 또는 그 업무의 담당자만
  ['delete', '/projects/:projectId/tasks/:taskId', ({ params }) => {
    const found = findTask(params.projectId, params.taskId)
    if (roleOf(params.projectId, currentUserId) !== 'OWNER' && found.assigneeId !== currentUserId) {
      throw new MockHttpError(403, '업무를 삭제할 권한이 없습니다.', 'FORBIDDEN')
    }
    tasks.splice(tasks.indexOf(found), 1)
    return null
  }],

  // 저장소 연결
  ['get', '/projects/:projectId/github/repository', ({ params }) => githubRepos[params.projectId] ?? null],
  ['post', '/projects/:projectId/integrations/github', ({ params, body }) => {
    const match = String(body.repositoryUrl).match(/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/)
    if (!match) throw new MockHttpError(400, 'GitHub 저장소 주소 형식이 올바르지 않습니다.', 'INVALID_REPOSITORY')
    githubRepos[params.projectId] = { fullName: match[1], url: String(body.repositoryUrl) }
    return githubRepos[params.projectId]
  }],
  // CI/CD: 파이프라인은 GitHub 저장소가 연결된 프로젝트만, 배포는 배포 기록을 받은 프로젝트만 데이터가 있다
  ['get', '/projects/:projectId/cicd/pipelines', ({ params, query }) =>
    githubRepos[params.projectId]
      ? fetchMockPipelines({ page: Number(query.page ?? 0), size: Number(query.size ?? 10) })
      : { pipelines: [], collectedAt: now(), totalCount: 0 }],
  ['get', '/projects/:projectId/deployments', ({ params, query }) =>
    deployedProjectIds.has(params.projectId)
      ? fetchMockDeploymentPage({ page: Number(query.page ?? 0), size: Number(query.size ?? 10) })
      : { deployments: [], collectedAt: now(), totalCount: 0 }],

  // 장애
  ['get', '/projects/:projectId/incidents', ({ params }) => incidentsOf(params.projectId)],
  // I7 내가 팀원인 모든 프로젝트의 장애. status는 쉼표, 생략 시 OPEN·ACKNOWLEDGED, 최신순 최대 100건
  ['get', '/users/me/incidents', async ({ query }) => {
    const statuses = (query.status ?? 'OPEN,ACKNOWLEDGED').split(',')
    if (statuses.some((status) => !['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(status))) {
      throw new MockHttpError(400, '잘못된 요청입니다.', 'INVALID_REQUEST')
    }
    const myProjects = projects.filter((project) => roleOf(project.id, currentUserId))
    const all = (await Promise.all(myProjects.map((project) => incidentsOf(project.id)))).flat()
    return {
      openCount: all.filter((incident) => incident.status === 'OPEN').length,
      incidents: all
        .filter((incident) => statuses.includes(incident.status))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 100),
    }
  }],
  ['patch', '/projects/:projectId/incidents/:incidentId/ack', async ({ params }) => {
    const incident = (await incidentsOf(params.projectId)).find((item) => item.id === params.incidentId)
    if (!incident) throw new MockHttpError(404, '장애를 찾을 수 없습니다.', 'INCIDENT_NOT_FOUND')
    // 이미 확인된 장애는 200과 현재 장애, 해결된 장애는 409 (Backend 확정)
    if (incident.status === 'RESOLVED') throw new MockHttpError(409, '이미 해결된 장애입니다.', 'INVALID_INCIDENT_STATUS')
    if (incident.status === 'OPEN') Object.assign(incident, { status: 'ACKNOWLEDGED', acknowledgedAt: now() })
    return incident
  }],
  // I6: OPEN·ACKNOWLEDGED 모두 해결 가능, 해결된 장애는 409
  ['patch', '/projects/:projectId/incidents/:incidentId/resolve', async ({ params }) => {
    const incident = (await incidentsOf(params.projectId)).find((item) => item.id === params.incidentId)
    if (!incident) throw new MockHttpError(404, '장애를 찾을 수 없습니다.', 'INCIDENT_NOT_FOUND')
    if (incident.status === 'RESOLVED') throw new MockHttpError(409, '이미 해결된 장애입니다.', 'INVALID_INCIDENT_STATUS')
    Object.assign(incident, { status: 'RESOLVED', resolvedAt: now() })
    return incident
  }],
  ['patch', '/projects/:projectId/incidents/:incidentId/assignee', async ({ params, body }) => {
    const incident = (await incidentsOf(params.projectId)).find((item) => item.id === params.incidentId)
    if (!incident) throw new MockHttpError(404, '장애를 찾을 수 없습니다.', 'INCIDENT_NOT_FOUND')
    incident.assigneeId = Number(body.assigneeId)
    return incident
  }],

  // Kubernetes·모니터링 (프로젝트에 연결한 환경 기준)
  ['get', '/projects/:projectId/k8s/deployments', ({ params, query }) => {
    requirePrometheus(params.projectId, query.env)
    return fetchMockK8sDeployments()
  }],
  ['get', '/projects/:projectId/k8s/pods', ({ params, query }) => {
    requirePrometheus(params.projectId, query.env)
    return fetchMockK8sPods()
  }],
  ['get', '/projects/:projectId/monitoring/summary', ({ params, query }) => {
    requirePrometheus(params.projectId, query.env)
    return fetchMockMonitoringSummary((query.range as MonitoringRange) ?? '1h')
  }],

  // 환경·인프라 E1~E5
  ['get', '/projects/:projectId/environments', ({ params }) =>
    sortEnvironments(params.projectId).map((environment) => {
      const connected = environment.prometheus !== null
      const deployed = deployedProjectIds.has(params.projectId)
      return {
        name: environment.name,
        label: environment.label,
        health: connected && deployed ? 'HEALTHY' : 'UNKNOWN',
        reason: !connected ? 'NOT_CONNECTED' : !deployed ? 'NOT_DEPLOYED' : null,
        currentImageTag: deployed ? 'v0.9.4-a41e9d7' : null,
        lastDeployedAt: deployed ? at(12) : null,
        replicas: connected && deployed ? { ready: 2, desired: 2 } : null,
        openIncidents: environment.isDefault ? 1 : 0,
        collectedAt: connected ? now() : null,
      }
    })],
  ['get', '/projects/:projectId/k8s/nodes', ({ params, query }) => {
    requirePrometheus(params.projectId, query.env)
    return {
      nodes: [
        { name: 'k8s-master', roles: ['control-plane'], ready: true, cpuUsage: 38.5, memoryUsage: 61.2, kubeletVersion: 'v1.31.2', createdAt: at(60 * 24 * 5) },
        { name: 'k8s-worker-1', roles: ['worker'], ready: true, cpuUsage: 55, memoryUsage: 72.4, kubeletVersion: 'v1.31.2', createdAt: at(60 * 24 * 5) },
        { name: 'k8s-worker-2', roles: ['worker'], ready: false, cpuUsage: null, memoryUsage: null, kubeletVersion: 'v1.31.2', createdAt: at(60 * 24 * 5) },
      ],
      collectedAt: now(),
    }
  }],
  ['get', '/projects/:projectId/k8s/hpa', ({ params, query }) => {
    requirePrometheus(params.projectId, query.env)
    return {
      hpas: [{ name: 'backend-hpa', target: 'backend', currentReplicas: 3, desiredReplicas: 4, minReplicas: 2, maxReplicas: 6, currentCpuUtilization: 72, targetCpuUtilization: 60 }],
      collectedAt: now(),
    }
  }],
  ['get', '/projects/:projectId/cloud/database', ({ params, query }) => {
    const target = requireAwsOrPrometheus(params.projectId, query.env)
    return target.aws
      ? { source: 'RDS', identifier: target.aws.rdsInstanceId, engine: 'PostgreSQL 17.2', status: 'AVAILABLE', multiAz: true, cpuUsage: 12.3, connections: 8, storageUsedGb: 4.21, freeStorageGb: 15.79, lastBackupAt: at(60 * 18), collectedAt: now() }
      : { source: 'PROMETHEUS', identifier: null, engine: null, status: 'AVAILABLE', multiAz: null, cpuUsage: null, connections: 5, storageUsedGb: 0.42, freeStorageGb: null, lastBackupAt: null, collectedAt: now() }
  }],
  ['get', '/projects/:projectId/cloud/load-balancer', ({ params, query }) => {
    const target = requireAwsOrPrometheus(params.projectId, query.env)
    return target.aws
      ? { source: 'ALB', name: 'devflow-alb', healthyTargets: 2, unhealthyTargets: 0, requestCount: 1200, http5xxCount: 3, avgResponseTimeMs: 120, collectedAt: now() }
      : { source: 'PROMETHEUS', name: null, healthyTargets: 2, unhealthyTargets: 1, requestCount: 640, http5xxCount: 0, avgResponseTimeMs: 85.4, collectedAt: now() }
  }],

  // 클라우드 연결 CL1~CL5
  ['get', '/projects/:projectId/cloud/environments', ({ params }) => sortEnvironments(params.projectId)],
  ['post', '/projects/:projectId/cloud/environments', ({ params, body }) => {
    requireOwner(params.projectId)
    const created: CloudEnvironment = {
      id: nextEnvironmentId++, name: '', label: '', isDefault: environmentsOf(params.projectId).length === 0,
      prometheus: null, kubernetes: null, aws: null,
      awsTrust: { principalArn: MOCK_PRINCIPAL_ARN, externalId: `devflow-${Math.random().toString(36).slice(2, 12)}` },
      createdAt: now(), updatedAt: now(),
    }
    applyEnvironment(params.projectId, created, body)
    environmentsOf(params.projectId).push(created)
    ensureDefault(params.projectId)
    return created
  }],
  ['put', '/projects/:projectId/cloud/environments/:environmentId', ({ params, body }) => {
    requireOwner(params.projectId)
    const target = findEnvironment(params.projectId, params.environmentId)
    applyEnvironment(params.projectId, target, body)
    ensureDefault(params.projectId)
    return target
  }],
  ['delete', '/projects/:projectId/cloud/environments/:environmentId', ({ params }) => {
    requireOwner(params.projectId)
    findEnvironment(params.projectId, params.environmentId)
    cloudEnvironments[params.projectId] = environmentsOf(params.projectId).filter((item) => item.id !== params.environmentId)
    ensureDefault(params.projectId)
    return null
  }],
  ['post', '/projects/:projectId/cloud/environments/:environmentId/test', async ({ params }) => {
    requireOwner(params.projectId)
    const target = findEnvironment(params.projectId, params.environmentId)
    await new Promise((resolve) => setTimeout(resolve, 600))
    return {
      prometheus: target.prometheus
        ? { status: 'OK', message: 'Prometheus 응답 정상 (up 대상 12개)' }
        : { status: 'NOT_CONFIGURED', message: null },
      aws: target.aws
        ? { status: 'FAILED', message: '역할을 맡을 수 없습니다. 신뢰 정책의 주체와 ExternalId를 확인해 주세요.' }
        : { status: 'NOT_CONFIGURED', message: null },
      checkedAt: now(),
    }
  }],

  // Webhook 토큰 WT1·WT2 (경로의 type은 문자라 종류별로 둔다)
  ['get', '/projects/:projectId/webhook-tokens', ({ params }) => {
    requireOwner(params.projectId)
    return webhookTokens[params.projectId] ?? []
  }],
  ['post', '/projects/:projectId/webhook-tokens/deployment', ({ params }) => issueToken(params.projectId, 'deployment')],
  ['post', '/projects/:projectId/webhook-tokens/alertmanager', ({ params }) => issueToken(params.projectId, 'alertmanager')],
]

const matchRoute = (method: string, path: string) => {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue
    const keys: string[] = []
    const regex = new RegExp(
      `^${pattern.replace(/:(\w+)/g, (_, key: string) => {
        keys.push(key)
        return '(\\d+)'
      })}$`,
    )
    const match = path.match(regex)
    if (match) {
      const params = Object.fromEntries(keys.map((key, index) => [key, Number(match[index + 1])]))
      return { handler, params }
    }
  }
  return null
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// axios adapter: 실제 네트워크 대신 위 라우트로 응답한다. 응답 형태는 Backend 공통 응답(ApiResponse)과 같다.
export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await delay(250)

  const method = (config.method ?? 'get').toLowerCase()
  const path = (config.url ?? '').split('?')[0]
  const query = Object.fromEntries(
    Object.entries((config.params ?? {}) as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)]),
  )
  const body: Body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : {}

  const respond = (status: number, data: unknown): AxiosResponse => ({
    data,
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
    config,
  })

  const route = matchRoute(method, path)

  // 새로고침하면 메모리가 처음으로 돌아가므로, 로그인한 사용자는 토큰(mock-token-{userId})에서 다시 찾는다.
  const tokenUserId = Number(String(config.headers?.Authorization ?? '').match(/mock-token-(\d+)/)?.[1])
  if (users.some((user) => user.userId === tokenUserId)) currentUserId = tokenUserId

  try {
    if (!route) throw new MockHttpError(404, `목 모드에 없는 API입니다: ${method.toUpperCase()} ${path}`, 'MOCK_NOT_FOUND')
    const data = await route.handler({ params: route.params, query, body })
    return respond(200, { success: true, message: '요청이 성공했습니다.', data })
  } catch (error) {
    if (!(error instanceof MockHttpError)) throw error
    const response = respond(error.status, { success: false, message: error.message, code: error.code, data: null })
    throw new AxiosError(error.message, String(error.status), config, null, response)
  }
}
