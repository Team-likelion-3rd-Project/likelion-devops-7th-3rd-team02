#!/usr/bin/env node
// 최종 시연용 업무 데이터 넣기 (업무 12개 + 첨부파일 샘플)
// 화면에서 쓰는 Backend API(/api)만 호출한다. 다시 실행해도 같은 제목의 업무와 같은 이름의 첨부는 건너뛴다.
//
// 사용법 (frontend 폴더에서)
//   DEVFLOW_URL=https://team02-app.manoit.co.kr \
//   DEVFLOW_TOKEN=<accessToken> \
//   PROJECT_ID=1 \
//   MEMBER_EMAILS=member1@example.com,member2@example.com \
//   node scripts/seed-demo-data.mjs [--dry-run]
//
// 환경변수
//   DEVFLOW_URL      기본 http://localhost:3000 (개발 서버 프록시). 끝에 /api는 붙이지 않는다.
//   DEVFLOW_TOKEN    로그인 토큰. GitHub 로그인 계정은 비밀번호가 없으니 이 값을 쓴다
//                    (브라우저 개발자 도구 > Application > Session Storage > accessToken).
//   DEVFLOW_EMAIL, DEVFLOW_PASSWORD
//                    DEVFLOW_TOKEN이 없을 때 이메일 로그인으로 토큰을 받는다.
//   PROJECT_ID       업무를 넣을 프로젝트. 없으면 tasks.json의 project로 새로 만든다 (실행한 사람이 OWNER).
//   MEMBER_EMAILS    프로젝트에 팀원으로 넣고 담당자로 쓸 이메일 (쉼표로 구분, 가입된 계정만).
//                    tasks.json의 assignee 1, 2, ...가 이 순서다. 0은 실행한 사람.
//   --dry-run        아무것도 만들지 않고 할 일만 출력한다.
//
// 토큰과 비밀번호는 출력하지 않는다.

import { readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = join(here, 'demo-data')
const dryRun = process.argv.includes('--dry-run')

const baseUrl = (process.env.DEVFLOW_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
const memberEmails = (process.env.MEMBER_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean)

const CONTENT_TYPES = { '.md': 'text/markdown', '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json' }

let token = process.env.DEVFLOW_TOKEN ?? ''

// Backend 공통 응답 { success, message, data, code }에서 data를 꺼낸다. 실패하면 message로 멈춘다.
async function call(method, path, body) {
  const headers = { Authorization: `Bearer ${token}` }
  let payload
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(`${baseUrl}/api${path}`, { method, headers, body: payload })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(`${method} ${path} → ${response.status} ${json.code ?? ''} ${json.message ?? ''}`.trim())
    error.status = response.status
    error.code = json.code
    throw error
  }
  return json.data
}

async function login() {
  if (token) return
  const email = process.env.DEVFLOW_EMAIL
  const password = process.env.DEVFLOW_PASSWORD
  if (!email || !password) {
    throw new Error('DEVFLOW_TOKEN 또는 DEVFLOW_EMAIL·DEVFLOW_PASSWORD가 필요합니다.')
  }
  const data = await call('POST', '/auth/login', { email, password })
  token = data.accessToken
}

async function main() {
  const data = JSON.parse(await readFile(join(dataDir, 'tasks.json'), 'utf8'))
  console.log(`대상: ${baseUrl}${dryRun ? ' (dry-run: 만들지 않음)' : ''}`)

  await login()
  const me = await call('GET', '/users/me')
  console.log(`실행한 사람: ${me.name}`)

  // 1. 프로젝트
  let projectId = process.env.PROJECT_ID ? Number(process.env.PROJECT_ID) : null
  if (projectId === null) {
    if (dryRun) {
      console.log(`[프로젝트] "${data.project.name}" 새로 만들 예정`)
    } else {
      const project = await call('POST', '/projects', data.project)
      projectId = project.id
      console.log(`[프로젝트] "${project.name}" 만듦 (id ${projectId})`)
    }
  } else {
    const project = await call('GET', `/projects/${projectId}`)
    console.log(`[프로젝트] "${project.name}" (id ${projectId}, 내 역할 ${project.role ?? '-'})`)
  }

  // 2. 팀원: 담당자 번호(1, 2, ...) → userId
  const assigneeIds = [me.userId]
  const members = projectId === null ? [] : await call('GET', `/projects/${projectId}/members`)
  for (const email of memberEmails) {
    let member = members.find((item) => item.email === email)
    if (!member && !dryRun) {
      try {
        member = await call('POST', `/projects/${projectId}/members`, { email })
        console.log(`[팀원] ${email} 추가`)
      } catch (error) {
        console.warn(`[팀원] ${email} 추가 못 함: ${error.message}`)
      }
    } else if (!member) {
      console.log(`[팀원] ${email} 추가 예정`)
    }
    // dry-run에서는 아직 추가 전인 팀원도 담당자로 쓸 수 있는 것으로 본다.
    assigneeIds.push(member?.userId ?? (dryRun ? `${email}(추가 예정)` : null))
  }

  // 3. 업무: 이미 있는 제목은 건너뛴다 (size 최대 100)
  const existing = projectId === null
    ? []
    : (await call('GET', `/projects/${projectId}/tasks?size=100&sort=createdAt,desc`)).tasks
  const summary = { created: 0, skipped: 0, attached: 0 }

  for (const item of data.tasks) {
    const assigneeId = item.assignee === null ? null : (assigneeIds[item.assignee] ?? null)
    if (item.assignee !== null && assigneeId === null) {
      console.warn(`[업무] "${item.title}": 담당자 ${item.assignee}번이 없어 담당자 없이 만든다 (MEMBER_EMAILS 확인)`)
    }

    let task = existing.find((candidate) => candidate.title === item.title)
    if (task) {
      summary.skipped += 1
      console.log(`[업무] "${item.title}" 이미 있음, 건너뜀`)
    } else if (dryRun) {
      console.log(`[업무] "${item.title}" ${item.status} 만들 예정`)
      continue
    } else {
      task = await call('POST', `/projects/${projectId}/tasks`, {
        title: item.title,
        description: item.description,
        assigneeId,
      })
      if (item.status !== 'TODO') {
        await call('PATCH', `/projects/${projectId}/tasks/${task.id}/status`, { status: item.status })
      }
      summary.created += 1
      console.log(`[업무] "${item.title}" 만듦 (${item.status})`)
    }

    // 4. 첨부파일: 같은 이름이 이미 있으면 건너뛴다
    if (!task || !item.attachments?.length) continue
    const attached = dryRun ? [] : await call('GET', `/projects/${projectId}/tasks/${task.id}/attachments`)
    for (const relative of item.attachments) {
      const fileName = basename(relative)
      if (attached.some((attachment) => attachment.fileName === fileName)) {
        console.log(`  [첨부] ${fileName} 이미 있음, 건너뜀`)
        continue
      }
      if (dryRun) {
        console.log(`  [첨부] ${fileName} 올릴 예정`)
        continue
      }
      const content = await readFile(join(dataDir, relative))
      const type = CONTENT_TYPES[fileName.slice(fileName.lastIndexOf('.'))] ?? 'application/octet-stream'
      const form = new FormData()
      form.append('file', new Blob([content], { type }), fileName)
      await call('POST', `/projects/${projectId}/tasks/${task.id}/attachments`, form)
      summary.attached += 1
      console.log(`  [첨부] ${fileName} 올림`)
    }
  }

  console.log(`\n끝: 업무 ${summary.created}개 만듦, ${summary.skipped}개 건너뜀, 첨부 ${summary.attached}개 올림`)
  if (projectId !== null) console.log(`화면: ${baseUrl}/projects/${projectId}/tasks`)
}

main().catch((error) => {
  console.error(`\n실패: ${error.message}`)
  process.exit(1)
})
