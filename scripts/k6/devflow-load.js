// DevFlow 부하 테스트 (k6) — Wiki "성능-테스트" 참고
//
// 실행 예:
//   k6 run -e BASE_URL=https://<도메인> -e PROFILE=load scripts/k6/devflow-load.js
//   docker run --rm -i --network host -v "$PWD/scripts/k6:/s" grafana/k6:0.54.0 run -e BASE_URL=http://localhost:3000 /s/devflow-load.js
//
// 환경 변수
//   BASE_URL   대상 주소 (필수, 끝 / 없이)
//   PROFILE    smoke(기본) | load | spike | hpa
//   EMAIL, PASSWORD, PROJECT_ID  기존 계정·프로젝트로 돌릴 때 (없으면 테스트용 계정·프로젝트를 새로 만든다)
//   OPS=1      운영 화면 API(모니터링 요약·Pod)도 호출 — 클라우드가 연결된 프로젝트에서만
//
// 비밀번호는 명령줄 기록에 남지 않게 환경 변수로 넘긴다: export K6_PASSWORD=... 후 -e PASSWORD=$K6_PASSWORD
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const API = `${BASE}/api`;
const PROFILE = __ENV.PROFILE || 'smoke';
const OPS = __ENV.OPS === '1';

const profiles = {
  // 스크립트 동작 확인 (CI)
  smoke: { executor: 'constant-vus', vus: 2, duration: '20s' },
  // 평상시: 동시 20명까지 올려 3분 유지
  load: {
    executor: 'ramping-vus', startVUs: 0,
    stages: [{ duration: '1m', target: 20 }, { duration: '3m', target: 20 }, { duration: '30s', target: 0 }],
  },
  // 갑작스러운 증가: 10초 만에 50명
  spike: {
    executor: 'ramping-vus', startVUs: 0,
    stages: [{ duration: '10s', target: 50 }, { duration: '1m', target: 50 }, { duration: '20s', target: 0 }],
  },
  // HPA 확장 시연: CPU를 많이 쓰는 로그인(BCrypt)을 5분간 반복
  hpa: {
    executor: 'ramping-vus', startVUs: 0, exec: 'loginHeavy',
    stages: [{ duration: '1m', target: 30 }, { duration: '5m', target: 30 }, { duration: '1m', target: 0 }],
  },
};

export const options = {
  scenarios: { [PROFILE]: profiles[PROFILE] || profiles.smoke },
  thresholds: {
    // HighLatency 알림 기준(p95 1초)과 같게
    http_req_duration: PROFILE === 'hpa' ? ['p(95)<3000'] : ['p(95)<1000'],
    http_req_failed: PROFILE === 'hpa' ? ['rate<0.05'] : ['rate<0.01'],
    checks: ['rate>0.99'],
  },
  summaryTrendStats: ['avg', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const json = { 'Content-Type': 'application/json' };

function login(email, password) {
  const res = http.post(`${API}/auth/login`, JSON.stringify({ email, password }), { headers: json, tags: { name: 'login' } });
  check(res, { 'login 200': (r) => r.status === 200 });
  return res.json('data.accessToken');
}

// 테스트 시작 전 1회: 계정·프로젝트·업무 준비
export function setup() {
  let email = __ENV.EMAIL;
  let password = __ENV.PASSWORD;
  if (!email || !password) {
    email = `k6-${Date.now()}@devflow.dev`;
    password = `k6-${Math.random().toString(36).slice(2)}-Pw1`;
    const res = http.post(`${API}/auth/signup`, JSON.stringify({ email, password, name: 'k6 부하테스트' }), { headers: json });
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`signup failed: ${res.status} ${res.body}`);
    }
  }
  const token = login(email, password);
  if (!token) {
    throw new Error('login failed in setup');
  }
  const auth = { headers: { ...json, Authorization: `Bearer ${token}` } };

  let projectId = __ENV.PROJECT_ID;
  if (!projectId) {
    const res = http.post(`${API}/projects`, JSON.stringify({ name: `k6 ${PROFILE}`, description: 'k6 부하 테스트' }), auth);
    projectId = res.json('data.id');
    for (let i = 1; i <= 20; i++) {
      http.post(`${API}/projects/${projectId}/tasks`, JSON.stringify({ title: `부하 테스트 업무 ${i}` }), auth);
    }
  }
  return { token, projectId, email, password };
}

// 기본 시나리오: 화면을 여는 사용자 흐름 (대시보드 → 작업 보드 → CI/CD → 모니터링)
export default function (data) {
  const auth = { headers: { ...json, Authorization: `Bearer ${data.token}` } };
  const p = `${API}/projects/${data.projectId}`;
  const get = (url, name) => {
    const res = http.get(url, { ...auth, tags: { name } });
    check(res, { [`${name} 200`]: (r) => r.status === 200 });
    return res;
  };

  group('dashboard', () => {
    get(`${API}/users/me`, 'me');
    get(`${API}/projects`, 'projects');
    get(`${API}/users/me/incidents`, 'my_incidents');
    get(`${p}/environments`, 'environments');
    get(`${p}/deployments?size=3`, 'deployments');
  });
  sleep(1);

  group('task_board', () => {
    get(`${p}/tasks?page=0&size=12&sort=updatedAt,desc`, 'tasks');
    get(`${p}/tasks?keyword=%EB%B6%80%ED%95%98&status=TODO&page=0&size=12`, 'tasks_search');
    // 10%는 쓰기: 업무 생성 → 상태 변경
    if (Math.random() < 0.1) {
      const created = http.post(`${p}/tasks`, JSON.stringify({ title: `k6 ${__VU}-${__ITER}` }), { ...auth, tags: { name: 'task_create' } });
      check(created, { 'task_create 201': (r) => r.status === 201 || r.status === 200 });
      const id = created.json('data.id');
      if (id) {
        const patched = http.patch(`${p}/tasks/${id}/status`, JSON.stringify({ status: 'IN_PROGRESS' }), { ...auth, tags: { name: 'task_status' } });
        check(patched, { 'task_status 200': (r) => r.status === 200 });
      }
    }
  });
  sleep(1);

  group('cicd', () => {
    get(`${p}/deployments?size=10`, 'deployments_page');
  });

  if (OPS) {
    group('monitoring', () => {
      get(`${p}/monitoring/summary?range=1h`, 'monitoring_summary');
      get(`${p}/k8s/pods`, 'k8s_pods');
    });
  }
  sleep(1);
}

// HPA 시연: 로그인(BCrypt 해시 검증)으로 Backend CPU를 올린다
export function loginHeavy(data) {
  login(data.email, data.password);
  sleep(0.2);
}
