#!/usr/bin/env node
// AWS(또는 온프렘) 배포 후 Backend API 점검 — 시나리오 테스트 중 API로 확인 가능한 항목을 한 번에 확인한다.
//
// 사용: node scripts/aws-api-check.mjs
//   BASE_URL   점검 대상 (기본 https://devflowlab.net)
//   PROM_URL   (선택) dev 환경 Prometheus 주소. 주면 환경 등록·연결 확인·K8s/모니터링 조회까지 확인
//   GITHUB_REPO (선택) 파이프라인 확인용 저장소 (기본 Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02)
//
// 매 실행마다 테스트 계정 2개(apicheck-*@devflow.test)와 테스트 프로젝트 2개를 새로 만든다.
// 프로젝트 삭제 API가 없어 남지만, 테스트 계정에게만 보이므로 실제 사용자·시연 프로젝트에는 보이지 않는다.
// 업무·첨부는 끝에서 지운다. 비밀값은 출력하지 않는다(발급한 Webhook 토큰도 앞 8자만).

const BASE = (process.env.BASE_URL || 'https://devflowlab.net').replace(/\/$/, '');
const PROM_URL = process.env.PROM_URL || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02';
const RUN = Date.now().toString(36);
const PASSWORD = `check-${RUN}-pw`;

const results = [];
let current = '';

function section(name) {
  current = name;
  console.log(`\n■ ${name}`);
}

function check(id, label, ok, detail = '') {
  results.push({ section: current, id, label, ok: Boolean(ok), detail });
  console.log(`  ${ok ? '✅' : '❌'} [${id}] ${label}${!ok && detail ? `  → ${detail}` : ''}`);
  return Boolean(ok);
}

function skip(id, label, why) {
  results.push({ section: current, id, label, ok: null, detail: why });
  console.log(`  ⏭️  [${id}] ${label}  → ${why}`);
}

async function call(method, path, { token, json, form, redirect = 'follow' } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, { method, headers, body, redirect });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* 본문이 JSON이 아님 */ }
  return { status: res.status, data, text, headers: res.headers };
}

const short = (r) => `HTTP ${r.status} ${r.data?.code ?? ''} ${(r.data?.message ?? r.text ?? '').toString().slice(0, 120)}`;

function fileForm(name, content, type = 'text/plain') {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return form;
}

async function main() {
  console.log(`DevFlow API 점검: ${BASE}  (실행 ID ${RUN})`);

  // ── 0. 기본 ─────────────────────────────────────────────
  section('0. 기본 상태');
  const health = await call('GET', '/actuator/health');
  check('0-3', 'Backend 헬스 UP', health.status === 200 && health.data?.status === 'UP', short(health));
  const anon = await call('GET', '/api/users/me');
  check('C', '로그인 없이 API 호출 → 401 JSON', anon.status === 401 && anon.data?.success === false, short(anon));

  // ── 1. 로그인 ───────────────────────────────────────────
  section('1. 로그인');
  for (const provider of ['github', 'google']) {
    const r = await call('GET', `/oauth2/authorization/${provider}`, { redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    const host = provider === 'github' ? 'github.com' : 'accounts.google.com';
    const redirectUri = decodeURIComponent((loc.match(/redirect_uri=([^&]+)/) || [])[1] || '');
    check('1-2', `${provider} 로그인 → ${host}로 이동`, r.status >= 300 && r.status < 400 && loc.includes(host), `HTTP ${r.status} ${loc.slice(0, 80)}`);
    check('1-2', `${provider} 콜백 주소 = ${BASE}/login/oauth2/code/${provider}`,
      redirectUri === `${BASE}/login/oauth2/code/${provider}`, redirectUri || '(redirect_uri 없음)');
  }

  const owner = { email: `apicheck-${RUN}-owner@devflow.test`, name: '점검 OWNER' };
  const member = { email: `apicheck-${RUN}-member@devflow.test`, name: '점검 MEMBER' };
  for (const u of [owner, member]) {
    const s = await call('POST', '/api/auth/signup', { json: { email: u.email, password: PASSWORD, name: u.name } });
    check('0-4', `이메일 회원가입 (${u.name})`, s.status < 300 && s.data?.success, short(s));
    const l = await call('POST', '/api/auth/login', { json: { email: u.email, password: PASSWORD } });
    u.token = l.data?.data?.accessToken;
    check('0-4', `이메일 로그인 (${u.name})`, Boolean(u.token), short(l));
  }
  if (!owner.token || !member.token) throw new Error('로그인 실패로 이후 점검을 진행할 수 없습니다.');
  const me = await call('GET', '/api/users/me', { token: member.token });
  member.id = me.data?.data?.userId;
  check('1', '내 정보 조회', me.status === 200 && me.data?.data?.email === member.email, short(me));

  // ── 2. 업무 관리 ────────────────────────────────────────
  section('2. 업무 관리');
  const p = await call('POST', '/api/projects', { token: owner.token, json: { name: `API 점검 ${RUN}`, description: '자동 점검용 (테스트 계정 전용)' } });
  const pid = p.data?.data?.id;
  check('0-4', '프로젝트 생성 (OWNER)', pid && p.data?.data?.role === 'OWNER', short(p));
  const inv = await call('POST', `/api/projects/${pid}/members`, { token: owner.token, json: { email: member.email } });
  check('2', '팀원 초대', inv.status < 300 && inv.data?.success, short(inv));

  const tasksApi = `/api/projects/${pid}/tasks`;
  const created = [];
  for (const title of ['k6 부하 테스트', '로그인 화면', '배포 파이프라인']) {
    const t = await call('POST', tasksApi, { token: owner.token, json: { title } });
    created.push(t.data?.data?.id);
  }
  check('2-3', '업무 생성 3건', created.every(Boolean));
  const search = await call('GET', `${tasksApi}?keyword=k6`, { token: owner.token });
  check('2-2', '검색 "k6" → 1건', search.data?.data?.totalCount === 1, short(search));
  const st = await call('PATCH', `${tasksApi}/${created[1]}/status`, { token: owner.token, json: { status: 'IN_PROGRESS' } });
  check('2-4', '상태 변경', st.status === 200, short(st));
  const counts = await call('GET', `${tasksApi}?status=TODO`, { token: owner.token });
  const sc = counts.data?.data?.statusCounts || {};
  check('2-1', '상태 필터·열별 건수 (TODO 2, 진행 1)', counts.data?.data?.totalCount === 2 && sc.TODO === 2 && sc.IN_PROGRESS === 1, short(counts));
  const asg = await call('PATCH', `${tasksApi}/${created[0]}/assignee`, { token: owner.token, json: { assigneeId: member.id } });
  check('2-3', '담당자 지정', asg.data?.data?.assigneeId === member.id, short(asg));
  const unasg = await call('PATCH', `${tasksApi}/${created[2]}/assignee`, { token: owner.token, json: { assigneeId: null } });
  check('2-4', '담당자 해제 (담당자 없음)', unasg.status === 200 && unasg.data?.data?.assigneeId == null, short(unasg));
  const delForbidden = await call('DELETE', `${tasksApi}/${created[2]}`, { token: member.token });
  check('2-4', '담당자 아닌 MEMBER 업무 삭제 → 403', delForbidden.status === 403, short(delForbidden));

  // 첨부
  const att = `${tasksApi}/${created[0]}/attachments`;
  const memo = `DevFlow 첨부 점검 ${RUN}`;
  const up = await call('POST', att, { token: member.token, form: fileForm('점검 메모.txt', memo) });
  const a1 = up.data?.data?.id;
  check('2-5', '첨부 업로드 (MEMBER, 한글 파일 이름)', up.status === 201 && up.data?.data?.fileName === '점검 메모.txt', short(up));
  const up2 = await call('POST', att, { token: owner.token, form: fileForm('owner.txt', 'owner file') });
  const a2 = up2.data?.data?.id;
  const list = await call('GET', att, { token: owner.token });
  check('2-5', '첨부 목록 2건', Array.isArray(list.data?.data) && list.data.data.length === 2, short(list));

  const dl = await call('GET', `${att}/${a1}/download`, { token: member.token });
  const url = dl.data?.data?.url || '';
  const isS3 = /^https:\/\/[^/]*amazonaws\.com\//.test(url);
  if (check('2-6', '다운로드 주소가 S3 presigned URL', isS3, url ? url.split('?')[0].slice(0, 100) : short(dl))) {
    const keyPath = decodeURIComponent(new URL(url).pathname);
    check('2-9', `S3 경로 projects/${pid}/tasks/${created[0]}/`, keyPath.includes(`projects/${pid}/tasks/${created[0]}/`), keyPath);
    const got = await fetch(url);
    check('2-6', 'S3에서 내려받은 내용이 올린 파일과 같음', got.ok && (await got.text()) === memo, `HTTP ${got.status}`);
  } else if (url.startsWith('/api/attachments/files/')) {
    skip('2-9', 'S3 경로', 'S3가 아닌 local 저장소 (ATTACHMENT_STORAGE 확인)');
  }
  const delOther = await call('DELETE', `${att}/${a2}`, { token: member.token });
  check('2-8', 'MEMBER가 남의 첨부 삭제 → 403', delOther.status === 403, short(delOther));
  const big = await call('POST', att, { token: owner.token, form: fileForm('big.bin', new Uint8Array(11_000_000), 'application/octet-stream') });
  check('2-7', '10MB 초과 → 413', big.status === 413, short(big));
  const delOwn = await call('DELETE', `${att}/${a1}`, { token: member.token });
  check('2-5', '자기 첨부 삭제', delOwn.status === 200, short(delOwn));

  // ── 3. 연결 안 된 프로젝트 ──────────────────────────────
  section('3. 연결 안 된 프로젝트');
  const e = await call('POST', '/api/projects', { token: owner.token, json: { name: `API 점검 미연결 ${RUN}` } });
  const eid = e.data?.data?.id;
  const repo0 = await call('GET', `/api/projects/${eid}/github/repository`, { token: owner.token });
  check('3-1', '저장소 미연결 → null', repo0.status === 200 && repo0.data?.data == null, short(repo0));
  const pl0 = await call('GET', `/api/projects/${eid}/cicd/pipelines`, { token: owner.token });
  check('3-1', '파이프라인 빈 목록', pl0.data?.data?.totalCount === 0, short(pl0));
  const pods0 = await call('GET', `/api/projects/${eid}/k8s/pods`, { token: owner.token });
  check('3-2', '클라우드 미연결 → 404 CLOUD_NOT_CONNECTED', pods0.status === 404 && pods0.data?.code === 'CLOUD_NOT_CONNECTED', short(pods0));
  const envs0 = await call('GET', `/api/projects/${eid}/environments`, { token: owner.token });
  check('3-3', '환경 요약 조회 (오류 아님)', envs0.status === 200, short(envs0));

  // ── 4. 클라우드 연결 · 토큰 ─────────────────────────────
  section('4. 클라우드 연결 · 토큰');
  const envApi = `/api/projects/${pid}/cloud/environments`;
  const memberEnv = await call('POST', envApi, { token: member.token, json: { name: 'dev' } });
  check('4-6', 'MEMBER 환경 등록 → 403', memberEnv.status === 403, short(memberEnv));
  const prodEnv = await call('POST', envApi, { token: owner.token, json: { name: 'production', label: 'AWS' } });
  const trust = prodEnv.data?.data?.awsTrust || {};
  check('4-3', '신뢰 정책 ExternalId 발급', String(trust.externalId || '').startsWith('devflow-'), short(prodEnv));
  check('4-3', '신뢰 정책 주체 ARN 표시 (DEVFLOW_AWS_PRINCIPAL_ARN)', /^arn:aws:iam::\d+:role\//.test(trust.principalArn || ''), trust.principalArn || '(비어 있음)');
  const ssrf = await call('POST', envApi, { token: owner.token, json: { name: 'bad', prometheus: { url: 'http://169.254.169.254/latest' } } });
  check('보안', '메타데이터 주소 등록 차단 (SSRF)', ssrf.status === 400 && ssrf.data?.code === 'INVALID_CLOUD_TARGET', short(ssrf));

  if (PROM_URL) {
    const dev = await call('POST', envApi, {
      token: owner.token,
      json: { name: 'dev', label: '온프레미스', isDefault: true, prometheus: { url: PROM_URL }, kubernetes: { namespace: 'devflow', appDeployment: 'backend' } },
    });
    const devId = dev.data?.data?.id;
    check('4-2', 'dev 환경 등록 (사설 주소 허용)', dev.status < 300 && devId, short(dev));
    const t = await call('POST', `${envApi}/${devId}/test`, { token: owner.token });
    check('4-2', 'dev 연결 확인 → Prometheus OK', t.data?.data?.prometheus?.status === 'OK', JSON.stringify(t.data?.data?.prometheus ?? short(t)));
    for (const [id, path] of [['6-4', 'k8s/pods'], ['6-4', 'k8s/nodes'], ['6-4', 'k8s/hpa'], ['6-2', 'monitoring/summary']]) {
      const r = await call('GET', `/api/projects/${pid}/${path}?env=dev`, { token: owner.token });
      check(id, `dev ${path} 조회`, r.status === 200, short(r));
    }
  } else {
    skip('4-2', 'dev 환경 연결·K8s·모니터링 조회', 'PROM_URL 미지정 (화면에서 확인)');
  }

  const dtk = await call('POST', `/api/projects/${pid}/webhook-tokens/deployment`, { token: owner.token });
  const dtoken = dtk.data?.data?.token || '';
  check('4-5', '배포 토큰 발급 (dfw_)', dtoken.startsWith('dfw_'), short(dtk));
  const atk = await call('POST', `/api/projects/${pid}/webhook-tokens/alertmanager`, { token: owner.token });
  const atoken = atk.data?.data?.token || '';
  const tokList = await call('GET', `/api/projects/${pid}/webhook-tokens`, { token: owner.token });
  check('4-5', '토큰 목록에 원문 없음', Array.isArray(tokList.data?.data) && tokList.data.data.every((x) => !('token' in x)), short(tokList));
  const memberTok = await call('POST', `/api/projects/${pid}/webhook-tokens/deployment`, { token: member.token });
  check('4-6', 'MEMBER 토큰 발급 → 403', memberTok.status === 403, short(memberTok));
  console.log(`     (발급 토큰 ${dtoken.slice(0, 8)}…, ${atoken.slice(0, 8)}… — 테스트 프로젝트 전용)`);

  // ── 5. 코드 → 배포 ──────────────────────────────────────
  section('5. 코드 → 배포');
  const gh = await call('POST', `/api/projects/${pid}/integrations/github`, { token: owner.token, json: { repositoryUrl: `https://github.com/${GITHUB_REPO}` } });
  check('5-1', '저장소 연결', gh.status === 200 && gh.data?.data?.fullName?.toLowerCase() === GITHUB_REPO.toLowerCase(), short(gh));
  const pl = await call('GET', `/api/projects/${pid}/cicd/pipelines?size=3`, { token: owner.token });
  const first = pl.data?.data?.pipelines?.[0];
  check('5-2', '파이프라인 조회 + 5단계', first && (first.stages || []).map((s) => s.name).join(',') === 'BUILD,TEST,IMAGE,VERIFY,DEPLOY', short(pl));

  const hook = '/api/webhooks/deployments';
  const rec = { environment: 'production', service: 'backend', commitSha: `chk${RUN}`, imageTag: `chk${RUN}`, imageDigest: `sha256:${RUN}`, status: 'SUCCESS' };
  const d1 = await call('POST', hook, { token: dtoken, json: rec });
  const d2 = await call('POST', hook, { token: dtoken, json: rec });
  check('5-4', '배포 기록 Webhook (프로젝트 토큰)', d1.status === 200 && d1.data?.data?.id, short(d1));
  check('5-4', '같은 릴리스 재전송 → 중복 행 없음', d1.data?.data?.id && d1.data?.data?.id === d2.data?.data?.id, short(d2));
  const deps = await call('GET', `/api/projects/${pid}/deployments`, { token: member.token });
  check('5-5', '배포 이력 조회', deps.data?.data?.totalCount === 1, short(deps));

  // ── 7. 장애 대응 (Webhook 경로) ─────────────────────────
  section('7. 장애 대응 (알림 → 장애 → 해결, API 경로만)');
  const am = await call('POST', '/api/webhooks/alertmanager', {
    token: atoken,
    json: { version: '4', status: 'firing', alerts: [{ status: 'firing', fingerprint: `chk-${RUN}`, labels: { alertname: 'ApiCheck', severity: 'warning' }, annotations: { summary: 'API 점검용 테스트 알림' }, startsAt: new Date().toISOString() }] },
  });
  check('7-1', 'Alertmanager 알림 → 장애 생성', am.data?.data?.created === 1, short(am));
  const inc = await call('GET', `/api/projects/${pid}/incidents`, { token: owner.token });
  const iid = inc.data?.data?.[0]?.id;
  const ack = await call('PATCH', `/api/projects/${pid}/incidents/${iid}/ack`, { token: owner.token });
  check('7-3', '확인 처리 → ACKNOWLEDGED', ack.data?.data?.status === 'ACKNOWLEDGED', short(ack));
  const ia = await call('PATCH', `/api/projects/${pid}/incidents/${iid}/assignee`, { token: owner.token, json: { assigneeId: member.id } });
  check('7-3', '장애 담당자 지정', ia.data?.data?.assigneeId === member.id, short(ia));
  const badge = await call('GET', '/api/users/me/incidents', { token: member.token });
  check('7-5', '내 장애 목록·배지 건수', badge.status === 200 && typeof badge.data?.data?.openCount === 'number', short(badge));
  const res = await call('PATCH', `/api/projects/${pid}/incidents/${iid}/resolve`, { token: owner.token });
  check('7-4', '해결 처리 → RESOLVED', res.data?.data?.status === 'RESOLVED', short(res));

  // ── 정리 ───────────────────────────────────────────────
  section('정리');
  let cleaned = 0;
  for (const id of created) {
    const r = await call('DELETE', `${tasksApi}/${id}`, { token: owner.token });
    if (r.status === 200) cleaned += 1;
  }
  check('-', `테스트 업무·첨부 삭제 (${cleaned}/${created.length})`, cleaned === created.length);
}

function summary() {
  const done = results.filter((r) => r.ok !== null);
  const failed = results.filter((r) => r.ok === false);
  const skipped = results.filter((r) => r.ok === null);
  console.log('\n────────────────────────────────────────');
  console.log(`결과: 통과 ${done.length - failed.length} / 실패 ${failed.length} / 건너뜀 ${skipped.length}`);
  if (failed.length) {
    console.log('\n실패 항목 (시나리오 번호 → 담당에게 공유):');
    for (const f of failed) console.log(`  - [${f.id}] ${f.label}  → ${f.detail}`);
  }
  const scenario = (id) => /^\d-\d+$/.test(id);
  const allIds = [...new Set(results.filter((r) => r.ok !== null && scenario(r.id)).map((r) => r.id))];
  const ids = allIds.filter((id) => results.filter((r) => r.id === id && r.ok !== null).every((r) => r.ok));
  console.log(`\nAPI로 통과한 시나리오 번호: ${ids.sort().join(', ') || '(없음)'}`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(`\n중단: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(summary);
