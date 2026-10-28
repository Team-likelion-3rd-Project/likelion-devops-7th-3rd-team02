# DevFlow Frontend

DevFlow 3차 화면입니다. 업무 관리부터 CI/CD, 운영 상태, 장애 대응, 클라우드 연결 설정까지 한 화면에서 봅니다.
화면 구성과 동작 기준은 [Frontend 화면 설계서](../docs/frontend/Frontend_Design_Phase3.md)를 따릅니다.

- React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, axios
- 외부 서비스(GitHub, Prometheus, AWS)에는 직접 접근하지 않고 Backend API(`/api`)만 호출합니다.

## 개발 서버

```bash
npm ci
npm run dev        # http://localhost:3000
```

- Backend가 `localhost:8080`에 떠 있어야 합니다. 저장소 루트의 `docker-compose.yml`로 Postgres와 Backend를 띄울 수 있습니다 (`.env.example` 참고).
- 포트는 3000으로 둡니다. Backend CORS가 `http://localhost:3000`만 허용합니다.
- Vite 개발 서버가 `/api`, `/actuator`, `/oauth2`, `/login/oauth2`를 `localhost:8080`으로 전달합니다.
- `.env` 없이 동작합니다. API 주소를 바꿀 때만 `.env.example`을 `.env`로 복사해 `VITE_API_BASE_URL`을 바꿉니다.

## 빌드와 검사

```bash
npm run build      # tsc + vite build → dist/
npm run lint
```

## 배포

| 환경 | 방식 |
| --- | --- |
| AWS | GitHub Actions "Deploy Frontend"(수동 실행) → `dist/`를 S3에 올리고 CloudFront 캐시 무효화. CloudFront가 `/api/*`, `/oauth2/*`, `/login/oauth2/*`를 ALB로 보냅니다. |
| 온프렘, docker compose | `Dockerfile`(nginx)로 만든 이미지 |

## 시연 데이터 넣기

최종 시연용 업무 12개와 첨부파일 샘플 4개를 실제 API로 넣습니다. 다시 실행해도 같은 제목의 업무, 같은 이름의 첨부는 건너뜁니다.

```bash
# 먼저 할 일만 확인
DEVFLOW_URL=https://team02-app.manoit.co.kr \
DEVFLOW_TOKEN=<accessToken> \
PROJECT_ID=<프로젝트 id> \
MEMBER_EMAILS=팀원1@example.com,팀원2@example.com \
node scripts/seed-demo-data.mjs --dry-run

# 실제로 넣기: 같은 명령에서 --dry-run 만 뺍니다
```

- `DEVFLOW_TOKEN`: GitHub 로그인 계정은 비밀번호가 없으니 토큰을 씁니다. 브라우저 개발자 도구 > Application > Session Storage > `accessToken` 값입니다. 이메일 계정은 `DEVFLOW_EMAIL`, `DEVFLOW_PASSWORD`로 대신할 수 있습니다.
- `PROJECT_ID`를 빼면 `scripts/demo-data/tasks.json`의 프로젝트를 새로 만듭니다 (실행한 사람이 OWNER).
- `MEMBER_EMAILS`: 프로젝트에 팀원으로 넣고 담당자로 씁니다. 가입된 계정만 넣을 수 있습니다.
- 업무와 첨부 내용은 `scripts/demo-data/`에서 고칩니다. 토큰과 비밀번호는 출력하지 않습니다.

## 폴더

```text
src/
├── api/         Backend 호출 (axios 공통 인스턴스: api/axios.ts)
├── components/  화면 영역별 컴포넌트 (common, task, cicd, monitoring, settings, dashboard, project, auth)
├── context/     현재 프로젝트, 전체 장애 배지
├── hooks/       화면별 조회 상태
├── pages/       라우트 화면
├── types/       API 응답 타입
└── utils/       날짜·상태 표기 등
scripts/         시연 데이터 넣기 (빌드에 포함되지 않음)
```
