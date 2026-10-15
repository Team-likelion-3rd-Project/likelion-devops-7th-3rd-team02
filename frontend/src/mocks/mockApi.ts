import { AxiosError, AxiosHeaders } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { fetchMockDeploymentPage, fetchMockPipelines } from './cicd'
import { fetchMockIncidents } from './dashboard'
import { fetchMockK8sDeployments, fetchMockK8sPods, fetchMockMonitoringSummary } from './monitoring'
import type { GithubIssue } from '../types/github'
import type { Incident } from '../types/incident'
import type { GithubRepository, GitlabIntegration } from '../types/integration'
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

const issueLink = (number: number) => ({ number, url: `https://github.com/team02/devflow/issues/${number}` })
const prLink = (number: number, status: 'OPEN' | 'IN_REVIEW' | 'MERGED') => ({
  number,
  status,
  url: `https://github.com/team02/devflow/pull/${number}`,
})

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
  task(51, 1, '프로젝트 생성 시 저장소 연결', 'TODO', 1, 40, { issue: issueLink(51), pullRequest: null }),
  task(53, 1, '배포 이력 페이지네이션', 'TODO', 1, 90, { issue: issueLink(53), pullRequest: null }),
  task(55, 1, '모니터링 추이 차트', 'TODO', 3, 130, { issue: issueLink(55), pullRequest: null }),
  task(47, 1, '작업 목록 검색과 필터', 'IN_PROGRESS', 1, 20, { issue: issueLink(47), pullRequest: prLink(61, 'IN_REVIEW') }),
  task(49, 1, 'K8s 파드 상태 API 연동', 'IN_PROGRESS', 2, 60, { issue: issueLink(49), pullRequest: prLink(60, 'OPEN') }),
  task(52, 1, '장애 확인과 담당자 지정', 'IN_PROGRESS', 3, 75, { issue: issueLink(52), pullRequest: null }),
  task(42, 1, '로그인 세션 만료 처리', 'DONE', 1, 10, {
    description: '토큰이 만료되면 로그인 화면으로 보내고, 만료 안내를 한 번만 보여줍니다.',
    issue: issueLink(42),
    pullRequest: prLink(58, 'MERGED'),
  }),
  task(44, 1, '파이프라인 단계 표시', 'DONE', 2, 200, { issue: issueLink(44), pullRequest: prLink(57, 'MERGED') }),
  task(40, 1, 'GitHub 로그인', 'DONE', 3, 400, { issue: issueLink(40), pullRequest: prLink(55, 'MERGED') }),
  task(60, 1, '팀 회의록 정리', 'TODO', null, 300),
  task(61, 2, '기존 문서 목록 추출', 'IN_PROGRESS', 1, 50),
]

let nextTaskId = 100
let nextProjectId = 10

const githubIssues: Record<number, { id: number; number: number; title: string }[]> = {
  1: [
    { id: 1, number: 51, title: '프로젝트 생성 시 저장소 연결' },
    { id: 2, number: 56, title: '장애 알림 Slack 연동 검토' },
    { id: 3, number: 57, title: '배포 상세 화면 링크' },
    { id: 4, number: 55, title: '모니터링 추이 차트' },
  ],
}

const githubRepos: Record<number, GithubRepository | null> = {
  1: { fullName: 'team02/devflow', url: 'https://github.com/team02/devflow' },
}
const gitlabIntegrations: Record<number, GitlabIntegration | null> = {
  1: { projectPath: 'devflow/backend' },
}

const incidentsByProject: Record<number, Incident[]> = {}

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
    const assigneeId = Number(body.assigneeId)
    Object.assign(found, {
      assigneeId,
      assigneeName: users.find((user) => user.userId === assigneeId)?.name ?? null,
      updatedAt: now(),
    })
    return found
  }],

  // GitHub 이슈
  ['get', '/projects/:projectId/github/issues', ({ params }): GithubIssue[] =>
    (githubIssues[params.projectId] ?? []).map((issue) => ({
      ...issue,
      url: `https://github.com/team02/devflow/issues/${issue.number}`,
      imported: tasks.some((item) => item.projectId === params.projectId && item.issue?.number === issue.number),
    }))],
  ['post', '/projects/:projectId/github/issues/:issueId/tasks', ({ params }) => {
    const issue = (githubIssues[params.projectId] ?? []).find((item) => item.id === params.issueId)
    if (!issue) throw new MockHttpError(404, '이슈를 찾을 수 없습니다.', 'ISSUE_NOT_FOUND')
    if (tasks.some((item) => item.projectId === params.projectId && item.issue?.number === issue.number)) {
      throw new MockHttpError(409, '이미 업무로 가져온 이슈입니다.', 'DUPLICATE_ISSUE')
    }
    const created = task(nextTaskId++, params.projectId, issue.title, 'TODO', null, 0, {
      issue: issueLink(issue.number),
      pullRequest: null,
    })
    tasks.push(created)
    return created
  }],

  // 저장소 연결
  ['get', '/projects/:projectId/github/repository', ({ params }) => githubRepos[params.projectId] ?? null],
  ['post', '/projects/:projectId/integrations/github', ({ params, body }) => {
    const match = String(body.repositoryUrl).match(/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/)
    if (!match) throw new MockHttpError(400, 'GitHub 저장소 주소 형식이 올바르지 않습니다.', 'INVALID_REPOSITORY')
    githubRepos[params.projectId] = { fullName: match[1], url: String(body.repositoryUrl) }
    return githubRepos[params.projectId]
  }],
  ['get', '/projects/:projectId/integrations/gitlab', ({ params }) => gitlabIntegrations[params.projectId] ?? null],
  ['post', '/projects/:projectId/integrations/gitlab', ({ params, body }) => {
    if (!/^[\w.-]+(\/[\w.-]+)+$/.test(String(body.projectPath))) {
      throw new MockHttpError(400, 'GitLab 프로젝트 경로 형식이 올바르지 않습니다.', 'INVALID_GITLAB_PATH')
    }
    gitlabIntegrations[params.projectId] = { projectPath: String(body.projectPath) }
    return gitlabIntegrations[params.projectId]
  }],

  // CI/CD (GitLab이 연결된 프로젝트만 데이터가 있다)
  ['get', '/projects/:projectId/cicd/pipelines', ({ params, query }) =>
    gitlabIntegrations[params.projectId]
      ? fetchMockPipelines({ page: Number(query.page ?? 0), size: Number(query.size ?? 10) })
      : { pipelines: [], collectedAt: now(), totalCount: 0 }],
  ['get', '/projects/:projectId/deployments', ({ params, query }) =>
    gitlabIntegrations[params.projectId]
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
  ['patch', '/projects/:projectId/incidents/:incidentId/assignee', async ({ params, body }) => {
    const incident = (await incidentsOf(params.projectId)).find((item) => item.id === params.incidentId)
    if (!incident) throw new MockHttpError(404, '장애를 찾을 수 없습니다.', 'INCIDENT_NOT_FOUND')
    incident.assigneeId = Number(body.assigneeId)
    return incident
  }],

  // Kubernetes·모니터링
  ['get', '/projects/:projectId/k8s/deployments', () => fetchMockK8sDeployments()],
  ['get', '/projects/:projectId/k8s/pods', () => fetchMockK8sPods()],
  ['get', '/projects/:projectId/monitoring/summary', ({ query }) =>
    fetchMockMonitoringSummary((query.range as MonitoringRange) ?? '1h')],
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
