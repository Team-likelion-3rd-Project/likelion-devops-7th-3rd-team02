# DevFlow API 기능 테스트 결과

## 1. 테스트 개요

Frontend와 Backend 간 API 연동 상태를 확인하고,
2차 MVP 주요 기능의 정상 동작 및 권한 처리를 검증합니다.

### 테스트 환경

- Frontend: React + Vite
- Backend: Spring Boot
- Database: PostgreSQL
- 인증 방식: JWT Bearer Token
- 테스트 일자: 2026-08-__
- 테스트 환경: Local

### 테스트 결과 표기

- ✅ PASS: 기대 결과와 동일
- ❌ FAIL: 기대 결과와 다름
- ⏳ TODO: 미테스트

---

# 2. Auth API

## 2.1 회원가입

새로운 사용자를 등록합니다.

### Endpoint

`POST /api/auth/signup`

### 인증

불필요

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `201 Created` |
| 실제 HTTP Status | `201 Created` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 신규 사용자 회원가입 성공
- [x] Response 데이터 정상 확인
- [x] 중복 이메일 처리 확인
- [x] Console Error 없음

---

## 2.2 로그인

등록된 사용자 계정으로 로그인하고 Access Token을 발급받습니다.

### Endpoint

`POST /api/auth/login`

### 인증

불필요

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| Access Token 발급 | `발급 확인` |
| LocalStorage 저장 | `저장 확인` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 로그인 성공
- [x] `accessToken` 발급 확인
- [x] LocalStorage에 Access Token 저장 확인
- [x] 로그인 후 `/projects` 이동 확인
- [x] 잘못된 계정 정보 오류 처리 확인

---

# 3. User API

## 3.1 현재 사용자 정보 조회

현재 로그인한 사용자의 정보를 조회합니다.

### Endpoint

`GET /api/users/me`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] `userId` 정상 조회
- [x] `email` 정상 조회
- [x] `name` 정상 조회
- [x] Header 사용자 정보 정상 표시
- [x] 내 프로필 Modal 정보 정상 표시

---

# 4. Project API

## 4.1 프로젝트 생성

새로운 프로젝트를 생성합니다.

### Endpoint

`POST /api/projects`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `201 Created` |
| 실제 HTTP Status | `201 Created` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 프로젝트 생성 성공
- [x] 프로젝트 ID 생성 확인
- [x] 프로젝트 이름 정상 저장
- [x] 프로젝트 설명 정상 저장
- [x] 생성 사용자가 OWNER로 등록됨
- [x] 생성 후 Frontend 목록 반영 확인

---

## 4.2 참여 프로젝트 목록 조회

현재 사용자가 참여 중인 프로젝트 목록을 조회합니다.

### Endpoint

`GET /api/projects`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] OWNER 프로젝트 조회
- [x] MEMBER로 참여 중인 프로젝트 조회
- [x] 프로젝트 Dashboard 정상 표시
- [x] 프로젝트 ID 정상 확인
- [x] `ownerId` 정상 확인
- [x] `ownerName` 정상 확인

---

## 4.3 프로젝트 상세 조회

특정 프로젝트의 상세 정보를 조회합니다.

### Endpoint

`GET /api/projects/{projectId}`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 프로젝트 상세 조회 성공
- [x] 프로젝트 이름 정상 표시
- [x] 프로젝트 설명 정상 표시
- [x] `ownerId` 정상 확인
- [x] `ownerName` 정상 확인
- [x] `createdAt` 정상 확인

---

# 5. ProjectMember API

## 5.1 프로젝트 멤버 등록 - OWNER

OWNER 계정에서 새로운 프로젝트 멤버를 등록합니다.

### Endpoint

`POST /api/projects/{projectId}/members`

### 인증

필수

### 권한

`OWNER`

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `201 Created` |
| 실제 HTTP Status | `201 Created` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] OWNER 계정에서 `+ 추가` 버튼 표시
- [x] 가입된 사용자 이메일로 멤버 등록 성공
- [x] 등록 사용자의 Role이 `MEMBER`
- [x] 등록 후 멤버 목록 즉시 반영

---

## 5.2 프로젝트 멤버 등록 - MEMBER 권한 제한

MEMBER 사용자가 다른 사용자를 프로젝트에 등록할 수 없는지 확인합니다.

### Endpoint

`POST /api/projects/{projectId}/members`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `403 Forbidden` |
| 실제 HTTP Status | `403 Forbidden` |
| 결과 | ✅ PASS |
| 비고 | + UI 미노출 |

### 확인 사항

- [x] MEMBER 계정에서 `+ 추가` UI 미노출
- [x] MEMBER 권한으로 직접 요청 시 `403 Forbidden`

---

## 5.3 프로젝트 멤버 중복 등록

이미 프로젝트에 등록된 사용자를 다시 추가합니다.

### Endpoint

`POST /api/projects/{projectId}/members`

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `409 Conflict` |
| 실제 HTTP Status | `409 Conflict` |
| 기대 Error Code | `DUPLICATE_PROJECT_MEMBER` |
| 실제 Error Code | `이미 프로젝트에 등록된 사용자입니다.` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 중복 등록 차단
- [x] 오류 메시지 정상 표시

---

## 5.4 프로젝트 멤버 목록 조회

프로젝트에 참여 중인 OWNER 및 MEMBER를 조회합니다.

### Endpoint

`GET /api/projects/{projectId}/members`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] OWNER 조회
- [x] MEMBER 조회
- [x] `userId` 정상 확인
- [x] `name` 정상 확인
- [x] `email` 정상 확인
- [x] `role` 정상 확인
- [x] Frontend OWNER / MEMBER 권한 표시 정상

---

# 6. Task API

## 6.1 Task 생성

프로젝트에 새로운 Task를 생성합니다.

### Endpoint

`POST /api/projects/{projectId}/tasks`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `201 Created` |
| 실제 HTTP Status | `201 Created` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] Task 생성 성공
- [x] 제목 정상 저장
- [x] 설명 정상 저장
- [x] 담당자 정상 지정
- [x] 생성된 Task가 Board에 즉시 표시

---

## 6.2 Task 목록 조회

프로젝트의 Task 목록을 조회합니다.

### Endpoint

`GET /api/projects/{projectId}/tasks`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] Task 목록 조회 성공
- [x] TODO Task 정상 표시
- [x] IN_PROGRESS Task 정상 표시
- [x] DONE Task 정상 표시
- [x] 담당자 정보 정상 표시

---

## 6.3 Task 상세 조회

특정 Task의 상세 정보를 조회합니다.

### Endpoint

`GET /api/projects/{projectId}/tasks/{taskId}`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] Task 상세 조회 성공
- [x] Task ID 정상 확인
- [x] 프로젝트 ID 정상 확인
- [x] 상태 정상 확인
- [x] 담당자 정보 정상 확인

---

## 6.4 Task 상태 변경

Task의 상태를 변경합니다.

### Endpoint

`PATCH /api/projects/{projectId}/tasks/{taskId}/status`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 변경 상태 | `TODO → IN_PROGRESS → DONE` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] `TODO → IN_PROGRESS` 변경 성공
- [x] `IN_PROGRESS → DONE` 변경 성공
- [x] Frontend Task Board 즉시 반영
- [x] 새로고침 후에도 상태 유지

---

## 6.5 Task 담당자 변경

Task 담당자를 다른 프로젝트 멤버로 변경합니다.

### Endpoint

`PATCH /api/projects/{projectId}/tasks/{taskId}/assignee`

### 인증

필수

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 변경 담당자 | `변경 확인` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 프로젝트 멤버로 담당자 변경 성공
- [x] `assigneeId` 정상 변경
- [x] `assigneeName` 정상 변경
- [x] Frontend Task Card 즉시 반영
- [x] 새로고침 후에도 담당자 유지

---

# 7. Authentication / Authorization 테스트

## 7.1 인증 토큰 없이 API 접근

인증이 필요한 API에 Access Token 없이 요청합니다.

### 테스트 Endpoint

`GET /api/users/me`

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `401 Unauthorized` |
| 실제 HTTP Status | `401 Unauthorized` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 인증 없는 API 접근 차단
- [x] Frontend 보호 Route 접근 시 `/login` 이동

---

## 7.2 프로젝트 비참여 사용자 접근

프로젝트의 OWNER 또는 MEMBER가 아닌 사용자가 프로젝트에 접근합니다.

### 테스트 Endpoint

`GET /api/projects/{projectId}`

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `403 Forbidden` |
| 실제 HTTP Status | `403 Forbidden` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] 프로젝트 비참여 사용자 접근 차단

---

# 8. Monitoring API

## 8.1 Backend Health Check

Backend 서비스 상태를 확인합니다.

### Endpoint

`GET /actuator/health`

### 인증

불필요

### 테스트 항목

| 항목 | 내용 |
|---|---|
| 기대 HTTP Status | `200 OK` |
| 실제 HTTP Status | `200 OK` |
| 기대 Status | `UP` |
| 실제 Status | `UP` |
| 결과 | ✅ PASS |
| 비고 | |

### 확인 사항

- [x] `/actuator/health` 정상 호출
- [x] HTTP `200 OK`
- [x] Response `status: UP`
- [x] Frontend Backend Health `정상` 표시
- [x] Frontend Service Status 정상 표시

---

# 9. Frontend 통합 동작 테스트

## 9.1 OWNER 계정

| 테스트 항목 | 결과 | 비고 |
|---|---|---|
| 로그인 | ✅ PASS | |
| 프로젝트 생성 | ✅ PASS | |
| 프로젝트 목록 조회 | ✅ PASS | |
| 프로젝트 상세 조회 | ✅ PASS | |
| OWNER 권한 표시 | ✅ PASS | |
| 멤버 추가 UI 표시 | ✅ PASS | |
| 멤버 추가 | ✅ PASS | |
| Task 생성 | ✅ PASS | |
| Task 상태 변경 | ✅ PASS | |
| Task 담당자 변경 | ✅ PASS | |
| 내 프로필 조회 | ✅ PASS | |
| Backend Health 확인 | ✅ PASS | |

---

## 9.2 MEMBER 계정

| 테스트 항목 | 결과 | 비고 |
|---|---|---|
| 로그인 | ✅ PASS | |
| 참여 프로젝트 조회 | ✅ PASS | |
| 프로젝트 상세 조회 | ✅ PASS | |
| MEMBER 권한 표시 | ✅ PASS | |
| 멤버 추가 UI 미노출 | ✅ PASS | |
| Task 생성 | ✅ PASS | |
| Task 상태 변경 | ✅ PASS | |
| Task 담당자 변경 | ✅ PASS | |
| 내 프로필 조회 | ✅ PASS | |

---

# 10. 최종 테스트 결과

## API 테스트 요약

| 구분 | PASS | FAIL | TODO |
|---|---:|---:|---:|
| Auth | 2 | 0 | 0 |
| User | 1 | 0 | 0 |
| Project | 3 | 0 | 0 |
| ProjectMember | 4 | 0 | 0 |
| Task | 5 | 0 | 0 |
| Authorization | 2 | 0 | 0 |
| Monitoring | 1 | 0 | 0 |

## 최종 결과

- 전체 테스트 결과: `✅ PASS`
- Console Error: `0`
- React Warning: `0`
- 의도하지 않은 4xx / 5xx 응답: `0`

## 발견된 이슈

- 프로젝트 상세 화면의 `최근 업데이트`가 하위 리소스 변경 시 갱신되지 않는 현상 확인
- Backend 협의 결과 추후 `lastActivityAt`을 추가하는 방향으로 결정
- 현재 MVP에서는 `최근 업데이트`를 `프로젝트 생성일`로 변경하고 `createdAt`을 표시하도록 수정 완료

## 비고

- Frontend와 Backend 간 주요 API 연동 정상 확인
- OWNER / MEMBER 권한별 UI 및 API 동작 정상 확인
- 프로젝트 활동 시간은 추후 `lastActivityAt` 도입 시 반영 예정
