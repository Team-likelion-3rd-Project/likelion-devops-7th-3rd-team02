# DevFlow 2차 프로젝트 Frontend 화면 설계서 최종본

작성자: 이주원

문서 상태: 최종본

담당 영역: Frontend 및 화면 설계

작성 기준일: 2026-08-13

문서 목적:  
DevFlow 2차 프로젝트 MVP에 실제 구현된 화면, 사용자 흐름, 권한 처리, Frontend 컴포넌트 구조와 Backend API 연동 항목을 최종 기준으로 정의한다.

> 본 문서는 기존 `frontend-design_v2.md`의 장·절 구조를 유지하면서 현재 구현과 다른 내용을 수정한 최종본이다.

# 1. Frontend 설계 범위

DevFlow 2차 프로젝트 Frontend는 사용자가 회원가입과 로그인을 하고, 참여 프로젝트와 업무를 관리하며 Backend Health 상태를 확인할 수 있도록 구성한다.

기능은 2차 MVP 구현 기능, 추후 선택 구현 기능, 3차 프로젝트 확장 기능, 이번 MVP 제외 기능으로 구분한다.

## 1.1 필수 구현 기능

- 로그인 및 회원가입
- 현재 로그인한 사용자 정보 조회
- Header 프로필 모달
- 로그아웃
- 프로젝트 목록 조회
- 프로젝트 생성
- 프로젝트 상세 조회
- 프로젝트 팀원 목록 조회
- Sidebar의 팀원 및 `OWNER`/`MEMBER` 역할 표시
- 프로젝트 `OWNER`의 팀원 등록
- 업무 목록 조회
- 업무 생성
- 업무 상태 변경
- 업무 담당자 변경
- Backend Health 상태 확인
- Health 결과를 이용한 Service Status 표시
- 공통 Header 및 Layout
- 로딩, 오류, 빈 데이터 상태 처리
- `ProjectDetailPage` 컴포넌트 분리
- `useProjectDetailData` Custom Hook을 통한 상세 데이터 관리
- 프로젝트 권한 판별 및 Task 정규화 custom util 적용

프로젝트 목록과 업무 목록은 현재 응답 배열 전체를 표시한다. 페이지네이션과 필터는 필수 구현에 포함하지 않는다.

## 1.2 추후 선택 구현 기능

2차 MVP 완료 이후 필요성과 일정에 따라 다음 기능을 별도 이슈로 구현할 수 있다.

- 프로젝트 최근 활동 시각 `lastActivityAt` 표시
- 프로젝트 수정
- 프로젝트 삭제
- 프로젝트 팀원 삭제
- 업무 제목·내용 일반 수정
- 업무 삭제
- 업무 상태 필터
- 담당자별 업무 필터
- 프로젝트 및 업무 목록 페이지네이션
- Health 응답 시간 표시

선택 기능은 현재 화면의 완료 조건에 포함하지 않는다.

## 1.3 3차 프로젝트 확장 기능

다음 기능은 이번 2차 프로젝트 범위에 포함하지 않고 3차 프로젝트 이후 확장 기능으로 분류한다.

- GitLab Pipeline 조회
- 배포 이력 조회
- Kubernetes Pod 상태 조회
- Kubernetes Deployment 상태 조회
- 애플리케이션 로그 조회
- 업무 댓글
- 업무 첨부파일
- 알림
- 수동 배포
- 롤백

## 1.4 구현 제외 기능

다음 기능은 현재 실제 구현과 2차 MVP 범위에 포함되지 않으므로 이번 Frontend에서는 구현하지 않는다.

- 프로젝트 수정 및 삭제
- 프로젝트 팀원 삭제
- 업무 제목·내용 일반 수정
- 업무 삭제
- 프로젝트 및 업무 목록 페이지네이션
- 프로젝트 및 업무 검색·필터
- 칸반 보드 드래그 앤 드롭
- 업무 마감일 및 우선순위
- 프로젝트별 세부 권한 관리 화면
- Grafana 데이터 직접 표시
- Kubernetes Pod 실시간 관리 화면
- `/api/system/status` 기반 별도 상태 화면

# 2. 전체 화면 목록

DevFlow Frontend는 인증 화면, 프로젝트 목록 화면, 프로젝트 상세 화면과 각 화면의 모달로 구성한다. Health와 Service Status는 프로젝트 상세 화면의 컴포넌트 영역으로 표시한다.

## 2.1 필수 화면

| 번호 | 화면명 | 주요 기능 | 로그인 필요 |
| --- | --- | --- | --- |
| 1 | 로그인 | 이메일과 비밀번호로 로그인 | 아니요 |
| 2 | 회원가입 | 새로운 사용자 계정 생성 | 아니요 |
| 3 | 프로젝트 목록 | 참여 프로젝트 조회 및 프로젝트 생성 | 예 |
| 4 | 프로젝트 상세 | 프로젝트 정보, 팀원, 업무, Health 및 Service Status 확인 | 예 |
| 5 | 업무 상세·변경 모달 | 업무 상세 확인, 상태 및 담당자 변경 | 예 |

별도의 프로젝트 수정·삭제 화면, 팀원 삭제 화면, 업무 일반 수정·삭제 화면, 독립 `HealthPage`는 이번 MVP에 포함하지 않는다.

## 2.2 화면별 주요 모달

### 프로젝트 목록 화면

- 프로젝트 생성 모달
- Header 프로필 모달

### 프로젝트 상세 화면

- Header 프로필 모달
- 팀원 등록 모달
- 업무 생성 모달
- 업무 상세·상태·담당자 변경 모달

### 이번 MVP 제외 모달

- 프로젝트 수정 모달
- 프로젝트 삭제 확인창
- 팀원 삭제 확인창
- 업무 일반 수정 및 삭제 확인창

## 2.3 화면 접근 기준

### 로그인하지 않은 사용자

- 로그인 화면
- 회원가입 화면

인증이 필요한 화면에 접근하면 로그인 화면으로 이동한다.

### 로그인한 사용자

- 프로젝트 목록 화면
- 참여 중인 프로젝트 상세 화면
- Header 프로필 모달
- 업무 상세·변경 모달

### 프로젝트 OWNER

- 프로젝트 상세 조회
- 프로젝트 팀원 및 역할 조회
- 팀원 등록
- 업무 생성
- 업무 상태 변경
- 업무 담당자 변경

프로젝트 수정·삭제와 팀원 삭제는 OWNER에게도 이번 MVP에서 제공하지 않는다.

### 프로젝트 MEMBER

- 참여 프로젝트 상세 조회
- 프로젝트 팀원 및 역할 조회
- 업무 목록 및 상세 조회
- 업무 생성
- 업무 상태 변경
- 업무 담당자 변경

MEMBER에게는 팀원 등록 버튼을 표시하지 않는다. MEMBER가 팀원 등록 API를 직접 호출한 경우 Backend의 `403 Forbidden` 응답을 처리한다.

## 2.4 이번 MVP 제외 기능 적용 화면

| 적용 화면 | 제외 기능 | 현재 처리 |
| --- | --- | --- |
| 프로젝트 목록 | 페이지네이션 | 응답 배열 전체 표시 |
| 프로젝트 목록 | 사용자 역할 표시 | 목록 응답에 `role`이 없어 표시하지 않음 |
| 프로젝트 상세 | 프로젝트 수정·삭제 | 버튼 및 모달 미제공 |
| 프로젝트 상세 | 프로젝트 팀원 삭제 | 삭제 버튼 미제공 |
| 프로젝트 상세 | 업무 일반 수정·삭제 | 상태·담당자 변경만 제공 |
| 프로젝트 상세 | 업무 상태·담당자 필터 | 필터 UI 미제공 |
| 서비스 상태 | `/api/system/status`, 버전·`checkedAt` | `/actuator/health`의 `status`만 사용 |

# 3. 전체 사용자 흐름

DevFlow의 핵심 사용자 흐름은 회원가입과 로그인 이후 프로젝트를 생성하거나 선택하고, 팀원과 업무를 관리한 뒤 프로젝트 상세 화면에서 Backend Health를 확인하는 순서로 구성한다.

## 3.1 전체 핵심 흐름

> 회원가입  
> → 로그인  
> → Access Token 저장  
> → 프로젝트 목록 조회  
> → 프로젝트 생성 또는 선택  
> → 프로젝트 상세 조회  
> → 멤버와 OWNER/MEMBER 역할 확인  
> → OWNER인 경우 팀원 등록  
> → 업무 생성  
> → 업무 상태 또는 담당자 변경  
> → Backend Health 및 Service Status 확인

## 3.2 회원가입 및 로그인 흐름

> 서비스 접속  
> → 회원가입 정보 입력  
> → 회원가입 완료  
> → 로그인 화면 이동  
> → 이메일과 비밀번호 입력  
> → 로그인 성공  
> → Access Token 저장  
> → 현재 사용자 정보 조회  
> → 프로젝트 목록 화면 이동

로그인하지 않은 사용자가 인증이 필요한 화면에 접근하면 로그인 화면으로 이동한다.

Header 프로필 영역을 선택하면 `GET /api/users/me` 결과를 이용한 프로필 모달을 표시한다.

로그아웃 시 Frontend에 저장된 Access Token과 사용자 정보를 삭제하고 로그인 화면으로 이동한다.

## 3.3 프로젝트 생성 및 조회 흐름

> 프로젝트 목록 조회  
> → 기존 프로젝트 선택 또는 새 프로젝트 생성  
> → 프로젝트 상세 화면 이동  
> → 프로젝트 기본 정보 확인  
> → 프로젝트 생성일 확인

프로젝트를 생성한 사용자는 해당 프로젝트의 `OWNER`로 등록된다.

`GET /api/projects` 응답에는 `role`과 `updatedAt`이 포함되지 않는다. 따라서 프로젝트 목록은 이름, 설명, OWNER 정보, `createdAt` 등 실제 응답 필드만 사용한다.

프로젝트 목록 페이지네이션은 이번 MVP에서 사용하지 않는다.

## 3.4 프로젝트 팀원 관리 흐름

> 프로젝트 상세 화면  
> → 현재 사용자와 프로젝트 OWNER 비교  
> → 팀원 목록 조회  
> → Sidebar에 이름·이메일·역할 표시  
> → OWNER인 경우 팀원 등록 버튼 표시  
> → 가입된 사용자의 이메일 입력  
> → 팀원 등록  
> → 팀원 목록 갱신

팀원 등록은 프로젝트 `OWNER`만 수행할 수 있다.

MEMBER에게는 팀원 등록 UI를 표시하지 않는다.

팀원 삭제는 이번 MVP에서 제외한다.

## 3.5 업무 생성 및 관리 흐름

> 프로젝트 상세 화면  
> → 업무 목록 조회  
> → 상태별 Board 데이터로 정규화  
> → 업무 생성  
> → 업무 상세 확인  
> → 업무 상태 변경  
> → 업무 담당자 변경  
> → 업무 목록 또는 화면 상태 갱신

업무 생성 시 상태는 Backend에서 `TODO`로 설정한다.

업무 상태는 다음 세 가지로 구분한다.

- 할 일: `TODO`
- 진행 중: `IN_PROGRESS`
- 완료: `DONE`

업무 담당자는 프로젝트 팀원 중에서 선택한다. 현재 구현의 핵심 변경 기능은 상태 변경과 담당자 변경이다.

## 3.6 업무 일반 수정 및 삭제 제외 흐름

이번 MVP에서는 업무 제목·내용을 변경하는 일반 수정 API와 업무 삭제 API를 화면에서 사용하지 않는다.

> 업무 상세·변경 모달  
> → 업무 내용 확인  
> → 상태 또는 담당자 변경  
> → 저장  
> → 화면 갱신

다음 흐름은 제공하지 않는다.

- 제목 또는 내용 일반 수정
- 삭제 버튼 선택
- 삭제 확인창
- 업무 삭제 요청

## 3.7 서비스 Health 상태 확인 흐름

> 프로젝트 상세 화면  
> → `GET /actuator/health` 호출  
> → HTTP 응답 확인  
> → 응답의 `status` 확인  
> → HealthSection 표시  
> → ServiceStatusPanel에 연결 상태 요약

정상 응답이 `200 OK`이고 `status`가 `UP`이면 정상 상태로 표시한다.

상태 조회에 실패하면 연결 실패 또는 상태 확인 불가 메시지를 표시한다.

`/api/system/status`, `version`, Backend 제공 `checkedAt` 값은 사용하지 않는다.

## 3.8 추후 확장 기능 흐름

추후 Backend에 `lastActivityAt`이 도입되면 다음 활동을 기준으로 최근 활동 시간을 갱신할 수 있다.

- 업무 생성
- 업무 상태 변경
- 업무 담당자 변경
- 프로젝트 팀원 추가
- 향후 프로젝트 정보 수정

현재는 다음 기준을 사용한다.

> 프로젝트 생성일  
> → `project.createdAt`

추후에는 생성일과 최근 활동을 구분한다.

> 프로젝트 생성일  
> → `project.createdAt`  
>
> 최근 활동  
> → `project.lastActivityAt`

# 4. 화면별 상세 구성

## 4.1 공통 Header 및 Layout

### 화면 목적

로그인한 사용자가 주요 화면으로 이동하고, 현재 사용자 정보를 확인하며 로그아웃할 수 있도록 공통 화면 구조를 제공한다.

프로젝트 상세 화면에서는 Sidebar를 함께 사용하여 프로젝트 멤버와 역할을 표시한다.

### 주요 구성 요소

- DevFlow 로고 또는 서비스명
- 프로젝트 목록 이동 요소
- 현재 사용자 프로필 영역
- Header 프로필 모달
- 로그아웃 기능
- 페이지 콘텐츠 영역
- 프로젝트 상세 Sidebar
- Sidebar 멤버 이름, 이메일 및 `OWNER`/`MEMBER` 역할

### 핵심 동작

- 로고 또는 프로젝트 메뉴 선택 시 프로젝트 목록으로 이동한다.
- Header 프로필 영역 선택 시 현재 사용자 정보를 모달로 표시한다.
- 프로필 모달의 사용자 데이터는 `GET /api/users/me` 결과를 사용한다.
- 로그아웃 시 저장된 JWT와 사용자 정보를 삭제하고 로그인 화면으로 이동한다.
- 인증되지 않은 사용자가 접근하면 로그인 화면으로 이동한다.
- 프로젝트 상세 Sidebar의 역할은 멤버 목록 응답의 `role`을 사용한다.
- OWNER에게만 Sidebar의 팀원 등록 버튼을 표시한다.

---

## 4.2 로그인 화면

### 화면 목적

가입된 사용자가 이메일과 비밀번호로 로그인할 수 있도록 한다.

### 주요 구성 요소

- 이메일 입력창
- 비밀번호 입력창
- 로그인 버튼
- 회원가입 이동 링크
- 오류 메시지 영역

### 핵심 동작

- 로그인 성공 시 Access Token을 저장한다.
- 현재 사용자 정보를 조회한다.
- 로그인 성공 후 프로젝트 목록 화면으로 이동한다.
- 로그인 실패 시 오류 메시지를 표시한다.
- 처리 중에는 로그인 버튼을 비활성화한다.

---

## 4.3 회원가입 화면

### 화면 목적

새로운 사용자가 이름, 이메일, 비밀번호를 입력하여 계정을 생성할 수 있도록 한다.

### 주요 구성 요소

- 이름 입력창
- 이메일 입력창
- 비밀번호 입력창
- 비밀번호 확인 입력창
- 회원가입 버튼
- 로그인 이동 링크
- 오류 메시지 영역

### 핵심 동작

- 이름과 이메일 입력 여부를 확인한다.
- 이메일 형식을 검증한다.
- 비밀번호가 8자 이상인지 확인한다.
- 비밀번호와 비밀번호 확인 값이 일치하는지 확인한다.
- 회원가입 성공 후 로그인 화면으로 이동한다.

비밀번호 확인 값은 Backend로 전달하지 않는다.

---

## 4.4 프로젝트 목록 화면

### 화면 목적

사용자가 참여 중인 프로젝트를 조회하고 새로운 프로젝트를 생성할 수 있도록 한다.

### 주요 구성 요소

- Header와 프로필 모달
- 프로젝트 생성 버튼
- 프로젝트 목록
- 프로젝트 카드
- 프로젝트 생성 모달
- 로딩, 빈 데이터, 오류 및 다시 시도 UI

### 프로젝트 카드 표시 정보

- 프로젝트 이름
- 프로젝트 설명
- 프로젝트 OWNER 이름
- 프로젝트 생성일 `createdAt`

현재 프로젝트 목록 응답의 주요 구조는 다음과 같다.

```json
{
  "id": 1,
  "name": "2차 프로젝트",
  "description": "2차 프로젝트 설명",
  "ownerId": 1,
  "ownerName": "이주원",
  "createdAt": "2026-08-12T07:23:17.604925"
}
```

목록 응답에는 `role`, `updatedAt`, 팀원 수, 업무 수가 포함되지 않는다. 해당 값을 프로젝트 카드의 필수 표시 항목으로 사용하지 않는다.

### 핵심 동작

- 프로젝트 카드를 선택하면 프로젝트 상세 화면으로 이동한다.
- 프로젝트 생성 모달에서 이름과 설명을 입력한다.
- 프로젝트 생성 성공 후 생성된 프로젝트를 목록에 반영한다.
- 생성자는 프로젝트 `OWNER`로 등록된다.
- 목록 응답 배열 전체를 표시하며 페이지네이션 UI는 제공하지 않는다.
- 목록 응답의 `role`을 전제로 OWNER/MEMBER Badge를 표시하지 않는다.

---

## 4.5 프로젝트 상세 화면

### 화면 목적

프로젝트 기본 정보, 팀원, 업무, Health 및 Service Status를 한 화면에서 확인하고 현재 MVP에 구현된 작업을 수행할 수 있도록 한다.

### 프로젝트 기본 정보 영역

- 프로젝트 이름
- 프로젝트 설명
- 프로젝트 OWNER
- 프로젝트 생성일 `createdAt`

상세 응답의 주요 구조는 다음과 같다.

```json
{
  "id": 1,
  "name": "2차 프로젝트",
  "description": "2차 프로젝트 설명",
  "ownerId": 1,
  "ownerName": "이주원",
  "createdAt": "2026-08-12T07:23:17.604925",
  "updatedAt": "2026-08-12T07:23:17.604925"
}
```

상세 응답에는 `createdAt`과 `updatedAt`이 모두 존재한다. 그러나 프로젝트 수정 기능이 이번 MVP에서 제외되어 있고, 팀원 또는 Task 변경 시 프로젝트 `updatedAt`이 갱신되지 않는다.

따라서 현재 화면 문구와 값은 다음과 같이 사용한다.

> 프로젝트 생성일  
> → `project.createdAt`

`최근 업데이트 → project.updatedAt` 표시는 사용하지 않는다. 추후 `lastActivityAt` 도입 시 최근 활동 표시를 별도로 추가한다.

### 팀원 관리 영역

- Sidebar의 팀원 이름
- 팀원 이메일
- 팀원 역할
- OWNER에게만 표시되는 팀원 등록 버튼
- 팀원 등록 모달

팀원 등록은 사용자의 이메일을 입력하여 처리한다.

프로젝트 목록 응답의 `role`이 아니라 멤버 목록 응답의 `role`을 이용해 Sidebar 역할을 표시한다.

현재 사용자 역할은 `currentUser.userId`와 `project.ownerId`, 멤버 목록 정보를 조합해 판별한다.

### 업무 관리 영역

- 상태별 업무 Board
- 업무 제목
- 업무 내용 또는 요약
- 업무 담당자
- 업무 상태
- 업무 생성 버튼
- 업무 생성 모달
- 업무 상세·상태·담당자 변경 모달

업무 생성 시 상태는 Backend에서 `TODO`로 설정한다.

업무 상태 변경과 담당자 변경은 구현한다.

업무 제목·내용 일반 수정과 삭제는 제공하지 않는다.

### Health 및 Service Status 영역

- `HealthSection`
- `ServiceStatusPanel`
- Backend Health 상태
- Frontend-Backend 연결 상태
- 로딩 및 오류 상태

두 컴포넌트는 `GET /actuator/health` 결과를 사용한다.

### 이번 MVP 제외 요소

- 프로젝트 수정 버튼 및 모달
- 프로젝트 삭제 버튼 및 확인창
- 프로젝트 팀원 삭제 버튼
- 업무 일반 수정 및 삭제 버튼
- 업무 상태 필터
- 담당자별 업무 필터
- 페이지네이션

---

## 4.6 업무 상세·상태·담당자 변경 모달

### 화면 목적

선택한 업무의 상세 정보를 확인하고, 구현된 범위 안에서 상태와 담당자를 변경할 수 있도록 한다.

### 주요 구성 요소

- 업무 제목
- 업무 내용
- 현재 담당자
- 담당자 선택
- 업무 상태 선택
- 저장 버튼
- 취소 또는 닫기 버튼
- 처리 오류 메시지

제목과 내용은 현재 MVP에서 일반 수정 대상으로 사용하지 않는다.

삭제 버튼은 표시하지 않는다.

### 업무 상태

| 화면 표시 | Backend 값 |
| --- | --- |
| 할 일 | `TODO` |
| 진행 중 | `IN_PROGRESS` |
| 완료 | `DONE` |

### 핵심 동작

- 업무 상세 정보를 확인한다.
- 프로젝트 팀원 중 담당자를 선택한다.
- 업무 담당자 변경 전용 API를 호출한다.
- 업무 상태 변경 전용 API를 호출한다.
- 변경 성공 후 Task Board를 즉시 갱신한다.
- 변경 실패 시 기존 값을 유지하고 오류 메시지를 표시한다.
- 업무 제목·내용 일반 수정 API와 삭제 API는 호출하지 않는다.

---

## 4.7 서비스 Health 상태 영역

### 화면 목적

프로젝트 상세 화면에서 Frontend와 Backend의 연결 상태 및 Backend Health를 확인할 수 있도록 한다.

### 주요 구성 요소

- `HealthSection`
- `ServiceStatusPanel`
- Backend 상태
- Frontend-Backend 연결 상태
- 다시 확인 동작
- 오류 메시지 영역

### 핵심 동작

- `GET /actuator/health`를 호출한다.
- 응답의 `status`를 화면에 표시한다.
- HTTP `200 OK`와 `status: UP`을 정상 상태로 처리한다.
- 요청 실패 시 연결 실패와 상태 확인 불가를 표시한다.
- 필요한 경우 같은 Health 요청을 다시 실행한다.
- `/api/system/status`는 호출하지 않는다.
- `version`과 Backend 제공 `checkedAt`을 필수 표시값으로 사용하지 않는다.

### 추후 선택 구현 요소

- 클라이언트 기준 마지막 확인 시간
- API 응답 시간
- 추가 Actuator 상세 정보

---

## 4.8 이번 MVP 제외 화면 요소

현재 화면에는 다음 요소를 추가하지 않는다.

| 적용 화면 | 제외 기능 |
| --- | --- |
| 프로젝트 목록 | 역할, 팀원 수, 업무 수를 응답 필드처럼 표시 |
| 프로젝트 목록 | 페이지 이동 UI |
| 프로젝트 상세 | 프로젝트 수정 |
| 프로젝트 상세 | 프로젝트 삭제 |
| 프로젝트 상세 | 프로젝트 팀원 삭제 |
| 프로젝트 상세 | 업무 제목·내용 일반 수정 |
| 프로젝트 상세 | 업무 삭제 |
| 프로젝트 상세 | 업무 상태 필터 |
| 프로젝트 상세 | 담당자별 업무 필터 |
| 서비스 상태 | `/api/system/status` 기반 버전·확인 시간 표시 |

# 5. 로딩·오류·빈 데이터 처리

Frontend는 Backend API 요청 결과에 따라 로딩, 오류, 빈 데이터 및 성공 상태를 사용자에게 명확하게 안내한다.

## 5.1 로딩 상태

데이터를 조회하거나 저장하는 동안 처리 중임을 표시한다.

### 공통 처리 방식

- 처리 중이라는 안내 문구 또는 로딩 표시를 제공한다.
- 실행 중인 생성·등록·변경 버튼을 일시적으로 비활성화한다.
- 동일한 요청이 중복으로 전송되지 않도록 한다.
- 처리가 완료되면 로딩 상태를 해제한다.
- 프로젝트 상세의 Project, Member, Task, Health 상태를 `useProjectDetailData`에서 관리한다.

### 예시 메시지

> 로그인 중입니다.  
>
> 프로젝트 목록을 불러오는 중입니다.  
>
> 프로젝트 정보를 불러오는 중입니다.  
>
> 업무를 저장하는 중입니다.  
>
> 서비스 상태를 확인하는 중입니다.

## 5.2 오류 상태

입력값이 올바르지 않거나 API 요청에 실패한 경우 이해하기 쉬운 오류 메시지를 표시한다.

| 오류 유형 | 처리 방식 |
| --- | --- |
| 입력값 오류 | 문제가 있는 입력 항목 주변에 메시지 표시 |
| 인증 오류 | 인증 정보 정리 후 로그인 화면으로 이동 |
| 권한 오류 | 해당 기능을 사용할 수 없다는 메시지 표시 |
| 조회 오류 | 오류 메시지와 다시 시도 기능 제공 |
| 생성·등록 오류 | 입력 내용과 모달을 유지하고 오류 표시 |
| 상태·담당자 변경 오류 | 기존 Task 상태를 유지하고 실패 메시지 표시 |
| Health 오류 | 프로젝트 데이터와 분리하여 상태 확인 불가 표시 |
| 서버 연결 오류 | 연결 실패 안내와 다시 시도 기능 제공 |

### 주요 오류 코드 반영

- `INVALID_REQUEST`: 입력한 정보를 다시 확인해주세요.
- `UNAUTHORIZED`: 로그인이 필요하거나 인증이 만료되었습니다.
- `FORBIDDEN`: 해당 기능을 사용할 권한이 없습니다.
- `USER_NOT_FOUND`: 가입된 사용자를 찾을 수 없습니다.
- `PROJECT_NOT_FOUND`: 프로젝트를 찾을 수 없습니다.
- `TASK_NOT_FOUND`: 업무를 찾을 수 없습니다.
- `DUPLICATE_EMAIL`: 이미 사용 중인 이메일입니다.
- `DUPLICATE_PROJECT_MEMBER` 또는 Backend 중복 멤버 코드: 이미 프로젝트에 등록된 팀원입니다.
- `INTERNAL_SERVER_ERROR`: 서버 오류가 발생했습니다. 다시 시도해주세요.

Backend의 상세 오류나 내부 정보를 사용자 화면에 그대로 노출하지 않는다.

## 5.3 인증 만료 처리

> 인증이 필요한 API 요청  
> → `UNAUTHORIZED` 응답 확인  
> → 저장된 Access Token과 사용자 정보 삭제  
> → 로그인 화면으로 이동  
> → 인증 만료 안내 메시지 표시

로그인과 회원가입 API에는 인증 Header를 사용하지 않는다.

## 5.4 빈 데이터 상태

API 요청은 성공했지만 표시할 데이터가 없는 경우 안내 문구와 다음 행동을 함께 제공한다.

| 화면 | 안내 문구 | 제공 기능 |
| --- | --- | --- |
| 프로젝트 목록 | 참여 중인 프로젝트가 없습니다. | 프로젝트 생성 버튼 |
| 업무 목록 | 등록된 업무가 없습니다. | 업무 생성 버튼 |
| Health | 상태 정보를 확인할 수 없습니다. | 다시 확인 동작 |

프로젝트에는 생성자가 `OWNER`로 등록되므로 정상 응답 기준 팀원 목록에는 최소 한 명이 표시된다.

필터 기능이 없으므로 필터 결과 전용 빈 데이터 상태는 제공하지 않는다.

## 5.5 성공 상태

생성, 등록 또는 변경에 성공하면 사용자에게 결과를 안내하고 관련 데이터를 갱신한다.

### 공통 처리 방식

- 성공 안내 메시지를 표시한다.
- 필요한 경우 열린 모달을 닫는다.
- 관련 목록 또는 상세 정보를 다시 조회하거나 로컬 상태를 갱신한다.
- 화면에 최신 데이터를 반영한다.
- 프로젝트 `updatedAt`이 함께 갱신된다고 가정하지 않는다.

### 예시 메시지

> 프로젝트가 생성되었습니다.  
>
> 팀원이 등록되었습니다.  
>
> 업무가 생성되었습니다.  
>
> 업무 상태가 변경되었습니다.  
>
> 업무 담당자가 변경되었습니다.

## 5.6 공통 처리 원칙

- 로딩 중에는 중복 요청을 방지한다.
- 오류 메시지는 사용자가 이해하기 쉬운 문장으로 표시한다.
- 다시 시도할 수 있는 기능을 제공한다.
- 입력 오류 발생 시 사용자가 작성한 내용을 유지한다.
- 빈 데이터 화면에는 다음 행동으로 이어지는 버튼을 제공한다.
- 성공한 작업은 목록 또는 상세 화면에 즉시 반영한다.
- 인증이 만료되면 로그인 화면으로 이동한다.
- OWNER/MEMBER UI 제한과 Backend 권한 응답을 함께 처리한다.
- 이번 MVP 제외 기능을 성공·오류 처리의 필수 대상으로 두지 않는다.

| 항목 | 설명 |
| --- | --- |
| 상태 코드 | HTTP 상태 코드 |
| 오류 코드 | 오류 종류를 구분하는 코드 |
| 메시지 | 사용자에게 표시할 처리 결과 |
| 데이터 | 정상 응답 데이터 또는 `null` |

# 6. Backend API 연동 목록

Frontend에서 실제로 사용하는 Backend API를 기능별로 정리한다.

업무 API는 `/api` Prefix를 사용하고, Health는 Backend Root의 `/actuator/health`를 사용한다.

## 6.1 인증 API

| 기능 | Method | API 경로 | 요청 데이터 | 인증 |
| --- | --- | --- | --- | --- |
| 회원가입 | `POST` | `/api/auth/signup` | 이메일, 비밀번호, 이름 | 불필요 |
| 로그인 | `POST` | `/api/auth/login` | 이메일, 비밀번호 | 불필요 |
| 현재 사용자 조회 | `GET` | `/api/users/me` | 없음 | 필요 |

로그인 성공 시 응답으로 받은 `accessToken`을 Frontend에 저장한다.

Header 프로필 모달은 현재 사용자 조회 결과를 표시한다.

로그아웃은 Frontend에 저장된 인증 정보를 삭제하는 방식으로 처리할 수 있으며, 실제 사용하지 않는 로그아웃 API를 필수 연동 목록에 포함하지 않는다.

## 6.2 프로젝트 API

| 기능 | Method | API 경로 | 요청 데이터 |
| --- | --- | --- | --- |
| 프로젝트 목록 조회 | `GET` | `/api/projects` | 없음 |
| 프로젝트 생성 | `POST` | `/api/projects` | 이름, 설명 |
| 프로젝트 상세 조회 | `GET` | `/api/projects/{projectId}` | 프로젝트 ID |

프로젝트 수정과 삭제 API는 이번 MVP에서 사용하지 않는다.

프로젝트 목록 API에는 `page`, `size`를 필수 Query Parameter로 전달하지 않는다.

### 프로젝트 목록 응답 기준

- `id`
- `name`
- `description`
- `ownerId`
- `ownerName`
- `createdAt`

목록 응답에는 `role`과 `updatedAt`이 없다.

### 프로젝트 상세 응답 기준

- `id`
- `name`
- `description`
- `ownerId`
- `ownerName`
- `createdAt`
- `updatedAt`

상세 화면의 날짜 표시는 `createdAt`을 사용한다.

## 6.3 프로젝트 팀원 API

| 기능 | Method | API 경로 | 요청 데이터 |
| --- | --- | --- | --- |
| 팀원 목록 조회 | `GET` | `/api/projects/{projectId}/members` | 프로젝트 ID |
| 팀원 등록 | `POST` | `/api/projects/{projectId}/members` | 사용자 이메일 |

팀원 등록 시 가입된 사용자의 이메일을 전달한다.

팀원 등록은 프로젝트 `OWNER`만 수행할 수 있다.

팀원 목록 응답의 `role`을 Sidebar의 `OWNER`/`MEMBER` 표시에 사용한다.

팀원 삭제 API는 이번 MVP에서 사용하지 않는다.

## 6.4 업무 API

| 기능 | Method | API 경로 | 요청 데이터 |
| --- | --- | --- | --- |
| 업무 목록 조회 | `GET` | `/api/projects/{projectId}/tasks` | 프로젝트 ID |
| 업무 생성 | `POST` | `/api/projects/{projectId}/tasks` | 제목, 내용, 담당자 ID |
| 업무 상태 변경 | `PATCH` | `/api/projects/{projectId}/tasks/{taskId}/status` | 상태 |
| 담당자 변경 | `PATCH` | `/api/projects/{projectId}/tasks/{taskId}/assignee` | 담당자 ID |

신규 업무의 상태는 Backend에서 `TODO`로 설정한다.

업무 제목·내용 일반 수정 API와 업무 삭제 API는 이번 MVP에서 호출하지 않는다.

화면에서 필요한 업무 상세 정보는 업무 목록 데이터와 현재 선택 Task를 이용한다. 별도 상세 API는 현재 Frontend 필수 흐름에 포함하지 않는다.

## 6.5 업무 목록 응답 및 조회 기준

업무 목록 API 응답은 배열이며 페이지네이션과 필터 Query Parameter를 이번 MVP에서 사용하지 않는다.

주요 Task 필드는 다음과 같다.

| 항목 | 설명 |
| --- | --- |
| `id` | 업무 ID |
| `projectId` | 프로젝트 ID |
| `title` | 업무 제목 |
| `description` | 업무 내용 |
| `status` | `TODO`, `IN_PROGRESS`, `DONE` |
| `assigneeId` | 담당자 ID |
| `assigneeName` | 담당자 이름 |
| `createdAt` | 업무 생성 시각 |
| `updatedAt` | 업무 변경 시각 |

`useProjectDetailData`가 받은 Task 배열은 custom util을 통해 상태별 Board 구조로 정규화한다.

업무 상태는 다음 값을 사용한다.

| 화면 표시 | Backend 값 |
| --- | --- |
| 할 일 | `TODO` |
| 진행 중 | `IN_PROGRESS` |
| 완료 | `DONE` |

## 6.6 서비스 상태 API

| 기능 | Method | API 경로 | 주요 응답 |
| --- | --- | --- | --- |
| Backend Health 확인 | `GET` | `/actuator/health` | `status` |

정상 응답 예시는 다음과 같다.

```json
{
  "status": "UP"
}
```

Frontend의 `HealthSection`과 `ServiceStatusPanel`은 `/actuator/health` 결과를 사용한다.

`/api/system/status`는 사용하지 않는다.

Liveness, Readiness, Prometheus Endpoint는 Kubernetes와 Monitoring 구성에서 사용할 수 있으나 현재 Frontend 화면의 필수 API는 아니다.

## 6.7 공통 인증 Header

인증이 필요한 API 요청에는 다음 Header를 포함한다.

> Authorization: Bearer {accessToken}

JWT가 없거나 만료된 경우 저장된 인증 정보를 삭제하고 로그인 화면으로 이동한다.

`/actuator/health`의 인증 여부는 실제 Backend 설정을 따르며 현재 Frontend 통합 테스트에서는 인증 없이 정상 응답을 확인한다.

## 6.8 공통 응답 형식

### 성공 응답

- `success`: 요청 성공 여부
- `message`: 처리 결과 메시지
- `data`: 응답 데이터

### 실패 응답

- `success`: `false`
- `message`: 오류 안내 메시지
- `code`: 오류 코드
- `data`: `null`

Frontend는 오류 응답의 `code`와 `message`를 이용하여 사용자에게 적절한 안내를 표시한다.

Actuator Health 응답은 업무 API 공통 Wrapper가 아니라 `status` 중심의 응답을 사용한다.

## 6.9 최종 구현 확인 사항

- 프로젝트 목록 응답에는 `role`이 없으므로 목록 카드에서 역할을 표시하지 않는다.
- 프로젝트 목록 응답에는 `createdAt`만 있고 상세 응답에는 `createdAt`과 `updatedAt`이 있다.
- 프로젝트 상세의 날짜 문구는 `프로젝트 생성일`이며 값은 `createdAt`이다.
- OWNER/MEMBER 역할 판별은 현재 사용자, `ownerId`, 멤버 목록을 조합한다.
- 팀원 등록은 OWNER에게만 UI를 노출하고 Backend 권한 오류도 처리한다.
- 업무 상태 변경은 상태 전용 API를 사용한다.
- 업무 담당자 변경은 담당자 전용 API를 사용한다.
- 프로젝트 수정·삭제, 팀원 삭제, 업무 일반 수정·삭제는 호출하지 않는다.
- 프로젝트 및 업무 페이지네이션·필터는 적용하지 않는다.
- Health는 `/actuator/health`를 사용한다.
- 추후 `lastActivityAt`이 도입되면 최근 활동 표시를 별도로 추가한다.

# 7. Frontend 컴포넌트 구조

Frontend 코드는 화면, 공통 UI, API 요청, 상세 데이터 관리 및 반복되는 순수 로직을 기준으로 분리한다.

리팩토링 이후 `ProjectDetailPage`는 모든 UI와 API 로직을 직접 소유하지 않고 하위 컴포넌트와 Custom Hook을 조합하는 페이지 컨테이너 역할을 한다.

## 7.1 전체 폴더 구조

아래 구조는 리팩토링 후 핵심 역할을 중심으로 정리한 것이다.

```text
src/
├── components/
│   ├── common/
│   │   └── Header 및 공통 상태 UI
│   ├── project/
│   │   ├── ProjectCard
│   │   ├── ProjectCreateModal
│   │   └── ProjectInfoPanel
│   ├── member/
│   │   └── MemberPanel
│   ├── task/
│   │   └── TaskBoard
│   └── health/
│       ├── HealthSection
│       └── ServiceStatusPanel
├── hooks/
│   └── useProjectDetailData
├── pages/
│   ├── LoginPage
│   ├── SignupPage
│   ├── ProjectListPage
│   └── ProjectDetailPage
├── api/
│   ├── client
│   ├── authApi
│   ├── projectApi
│   ├── memberApi
│   ├── taskApi
│   └── healthApi
├── routes/
└── utils/
    ├── 프로젝트 권한 판별 util
    └── Task 정규화 util
```

실제 파일 배치는 Repository 구현을 기준으로 하며, 이 문서는 각 요소의 책임과 의존 방향을 명세한다.

## 7.2 폴더별 역할

| 폴더 | 역할 |
| --- | --- |
| `components` | 화면 영역별 UI와 재사용 컴포넌트 관리 |
| `hooks` | 프로젝트 상세 조회 상태와 API 호출 흐름 관리 |
| `pages` | Route 단위 페이지와 하위 요소 조합 |
| `api` | Backend API 요청 함수 관리 |
| `routes` | 페이지 경로와 로그인 필요 여부 관리 |
| `utils` | 권한 판별과 Task 정규화 등 순수 공통 로직 관리 |

## 7.3 공통 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| `Header` | 화면 이동, 현재 사용자 프로필 진입 및 로그아웃 |
| Header 프로필 모달 | 현재 사용자 이름과 이메일 등 프로필 정보 표시 |
| 공통 Loading UI | API 요청 처리 중 상태 표시 |
| 공통 Error UI | 입력 오류와 API 오류 메시지 표시 |
| 공통 Empty UI | 프로젝트 또는 업무가 없는 상태 표시 |

삭제 기능이 없으므로 삭제 전용 `ConfirmModal`은 필수 공통 컴포넌트가 아니다.

페이지네이션이 없으므로 `Pagination` 컴포넌트는 필수 구조에 포함하지 않는다.

## 7.4 프로젝트 및 팀원 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| `ProjectCard` | 프로젝트 이름, 설명, OWNER, 생성일 표시 |
| `ProjectCreateModal` | 프로젝트 생성 정보 입력 |
| `ProjectInfoPanel` | 상세 프로젝트 이름, 설명, OWNER, `createdAt` 표시 |
| `MemberPanel` | Sidebar의 팀원 목록과 `OWNER`/`MEMBER` 역할 표시 |
| 팀원 등록 모달 | OWNER가 이메일로 팀원 등록 |

`ProjectEditModal`과 팀원 삭제 컴포넌트는 이번 MVP 구조에 포함하지 않는다.

## 7.5 업무 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| `TaskBoard` | Task를 `TODO`, `IN_PROGRESS`, `DONE` 상태별로 표시 |
| Task Card/Item | 제목, 담당자, 상태 등 업무 요약 표시 |
| 업무 생성 모달 | 새로운 업무 생성 |
| 업무 상세·변경 모달 | 상세 확인, 상태 및 담당자 변경 |

`TaskBoard`는 상태별 컬럼의 중복 Markup을 공통 구조로 정리한다.

업무 제목·내용 일반 수정, 삭제, 필터, 페이지네이션 컴포넌트는 필수 구조에 포함하지 않는다.

## 7.6 Health 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| `HealthSection` | `/actuator/health` 요청 결과와 오류·로딩 상태 표시 |
| `ServiceStatusPanel` | Health 결과를 기반으로 서비스 연결 상태 요약 |

`VersionInfo`와 `/api/system/status` 전용 컴포넌트는 사용하지 않는다.

## 7.7 페이지 컴포넌트

| 페이지 | 주요 역할 |
| --- | --- |
| `LoginPage` | 로그인 처리 |
| `SignupPage` | 회원가입 처리 |
| `ProjectListPage` | 프로젝트 목록 조회 및 생성 |
| `ProjectDetailPage` | 상세 데이터·권한·이벤트를 조합하고 하위 패널 배치 |

Health는 별도 `HealthPage`가 아니라 프로젝트 상세의 `HealthSection`과 `ServiceStatusPanel`로 구성한다.

`ProjectDetailPage`의 리팩토링 후 구조는 다음과 같다.

```text
ProjectDetailPage
├── useProjectDetailData
├── ProjectInfoPanel
├── MemberPanel
├── TaskBoard
├── HealthSection
└── ServiceStatusPanel
```

## 7.8 공통 Layout

로그인 이후 화면에는 공통 Header를 적용한다.

```text
Authenticated Layout
├── Header
│   └── 프로필 모달 / 로그아웃
└── Page Content
    ├── ProjectListPage
    └── ProjectDetailPage
        ├── Sidebar: MemberPanel
        └── Main Content
```

적용 화면:

- 프로젝트 목록
- 프로젝트 상세

로그인과 회원가입 화면에는 인증 후 Layout을 적용하지 않는다.

프로젝트 상세 Sidebar에는 프로젝트 팀원과 역할을 표시한다.

## 7.9 API 모듈

| API 모듈 | 역할 |
| --- | --- |
| `authApi` | 회원가입, 로그인 및 현재 사용자 조회 |
| `projectApi` | 프로젝트 목록, 생성 및 상세 조회 |
| `memberApi` | 팀원 목록과 등록 |
| `taskApi` | 업무 목록, 생성, 상태 변경 및 담당자 변경 |
| `healthApi` | `/actuator/health` 요청 |

API 요청 함수는 표시 컴포넌트에 직접 작성하지 않고 API 모듈과 `useProjectDetailData`를 통해 관리한다.

제외 API를 호출하기 위한 수정·삭제 함수는 이번 MVP 화면 흐름에 연결하지 않는다.

## 7.10 화면 이동 관리

| 경로 | 화면 | 로그인 필요 |
| --- | --- | --- |
| `/login` | 로그인 | 아니요 |
| `/signup` | 회원가입 | 아니요 |
| `/projects` | 프로젝트 목록 | 예 |
| `/projects/:projectId` | 프로젝트 상세 | 예 |

`ProtectedRoute`는 인증되지 않은 사용자가 로그인 필요 화면에 접근하는 것을 방지한다.

별도 `/health` 화면은 현재 필수 Route로 사용하지 않는다.

## 7.11 인증 정보 관리

- 로그인 성공 시 Access Token을 저장한다.
- 현재 사용자 정보를 조회하여 Header와 권한 판별에 사용한다.
- 인증이 필요한 API 요청에 Access Token을 포함한다.
- 로그아웃 시 저장된 인증 정보를 삭제한다.
- `UNAUTHORIZED` 응답을 받으면 인증 정보를 삭제하고 로그인 화면으로 이동한다.
- 프로젝트 역할은 전역 사용자 프로필이 아니라 프로젝트별 OWNER/멤버 정보로 판별한다.

인증 Header는 다음 형식을 사용한다.

> Authorization: Bearer {accessToken}

## 7.12 컴포넌트 구성 원칙

- 화면 단위 코드는 `pages`에서 관리한다.
- `ProjectDetailPage`는 상세 컴포넌트 조합과 이벤트 연결에 집중한다.
- 프로젝트 정보는 `ProjectInfoPanel`로 분리한다.
- 팀원과 역할은 `MemberPanel`로 분리한다.
- 상태별 업무 UI는 `TaskBoard`로 분리한다.
- Health와 Service Status는 `HealthSection`, `ServiceStatusPanel`로 분리한다.
- Project, Member, Task, Health 조회 상태와 갱신 흐름은 `useProjectDetailData`에서 관리한다.
- Backend 요청은 `api` 모듈에서 관리한다.
- 권한 판별과 Task 정규화는 `utils`의 순수 함수로 관리한다.
- 표시 컴포넌트가 같은 API를 중복 호출하지 않도록 한다.
- 로딩, 오류 및 빈 데이터 처리를 일관되게 적용한다.
- 이번 MVP 제외 기능을 위한 복잡한 상태나 컴포넌트를 선행 구현하지 않는다.

# 8. API 주소 및 환경변수 관리

Frontend는 Backend API 주소를 코드에 반복해서 직접 작성하지 않고 공통 API 설정과 환경변수로 관리한다.

업무 API와 Actuator Health는 경로 Prefix가 다르므로 `healthApi`가 `/api/system/status` 또는 `/api/actuator/health`로 잘못 요청하지 않도록 한다.

## 8.1 환경변수 이름

Vite 기반 Frontend에서는 Backend 주소 설정에 다음 환경변수를 사용할 수 있다.

```text
VITE_API_BASE_URL
```

기본 설정 예시:

```text
VITE_API_BASE_URL=/api
```

Frontend에서는 공통 API 설정 파일에서 환경변수를 한 번만 불러와 사용한다.

```javascript
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
```

각 페이지나 표시 컴포넌트에서 Backend Host를 반복해서 작성하지 않는다.

## 8.2 환경별 API 주소

| 환경 | 업무 API 예시 | Health API 예시 |
| --- | --- | --- |
| 로컬 개발 환경 | `http://localhost:8080/api` | `http://localhost:8080/actuator/health` |
| Kubernetes 환경 | `/api` | `/actuator/health` |

Kubernetes 환경에서는 다음과 같이 경로를 구분한다.

```text
/                  → Frontend Service
/api               → Backend 업무 API
/actuator/health   → Backend Health
```

Frontend는 Backend의 Kubernetes 내부 Service 주소를 직접 사용하지 않고 Ingress 또는 공통 API 설정을 통해 요청한다.

최종 Ingress 경로는 Kubernetes 담당자와 실제 배포 설정을 기준으로 한다.

## 8.3 환경변수 파일 예시

### 로컬 개발 환경

파일명:

```text
.env.development
```

설정 예시:

```text
VITE_API_BASE_URL=http://localhost:8080/api
```

업무 API 함수는 위 Base URL을 사용한다. `healthApi`는 업무 API Client와 경로를 분리하여 같은 Backend Host의 `/actuator/health`를 호출한다.

### Kubernetes 배포 환경

파일명:

```text
.env.production
```

설정 예시:

```text
VITE_API_BASE_URL=/api
```

동일 Origin의 상대 경로를 사용할 경우 업무 API는 `/api`를 사용한다. `healthApi`는 이 Base URL을 덧붙이지 않는 별도 Root 요청으로 `/actuator/health`를 호출한다.

환경변수 파일에는 비밀번호, Access Token 등 민감한 정보를 저장하지 않는다.

> 실제 Repository의 환경변수 값과 공통 Client 구성은 배포 설정을 최종 기준으로 한다.

## 8.4 공통 API 설정

API 관련 파일은 다음 역할로 구성한다.

```text
src/
└── api/
    ├── client
    ├── authApi
    ├── projectApi
    ├── memberApi
    ├── taskApi
    └── healthApi
```

`client`는 다음 역할을 담당한다.

- 환경변수에서 API 기본 주소 읽기
- JWT 인증 Header 추가
- 공통 요청 및 응답 처리
- 인증 만료 처리
- Backend 오류 응답 처리

`healthApi`는 다음 역할을 담당한다.

- `GET /actuator/health` 호출
- 업무 API Client의 `/api` Base URL과 분리된 Root 경로 사용
- `status` 응답 전달
- Health 요청 실패 전달

## 8.5 환경변수 적용 방식

Vite 환경변수는 Frontend 빌드 시점에 적용된다.

다음 항목은 CI/CD 및 Kubernetes 담당자와 실제 배포 설정을 기준으로 확인한다.

- GitHub Actions 또는 사용 중인 CI/CD에서 환경변수를 전달하는 방식
- Docker 이미지 빌드 시 환경변수를 적용하는 방식
- 개발 환경과 운영 환경의 값 분리 방식
- Kubernetes ConfigMap 사용 여부
- `/api`와 `/actuator/health` Ingress Routing
- 배포 후 환경변수 변경 시 Frontend 재빌드 필요 여부

## 8.6 확인 사항

- Frontend 업무 API의 `/api` 상대 경로 처리
- Health의 `/actuator/health` Root 경로 처리
- 로컬 Backend의 주소와 포트
- Ingress의 `/api` 경로 처리 방식
- Ingress의 `/actuator/health` 연결 방식
- 개발·운영 환경변수 분리 방식
- CI/CD 환경변수 주입 방식
- Docker 이미지 빌드 시 환경변수 적용 방식

# 9. 와이어프레임

와이어프레임은 현재 실제 기능 범위를 기준으로 화면의 구성 요소와 배치를 정리한다.

실제 색상, 크기 및 간격은 Frontend 구현을 최종 기준으로 한다.

## 9.1 로그인 화면

```text
┌──────────────────────────────────┐
│             DevFlow              │
│                                  │
│  이메일                          │
│  [ example@email.com          ]  │
│                                  │
│  비밀번호                        │
│  [ ●●●●●●●●                  ]  │
│                                  │
│  [            로그인          ]  │
│                                  │
│  계정이 없나요? 회원가입         │
│  오류 메시지 영역                │
└──────────────────────────────────┘
```

## 9.2 회원가입 화면

```text
┌──────────────────────────────────┐
│             DevFlow              │
│                                  │
│  이름          [              ]  │
│  이메일        [              ]  │
│  비밀번호      [              ]  │
│  비밀번호 확인 [              ]  │
│                                  │
│  [           회원가입          ] │
│                                  │
│  이미 계정이 있나요? 로그인      │
│  오류 메시지 영역                │
└──────────────────────────────────┘
```

## 9.3 프로젝트 목록 화면

```text
┌──────────────────────────────────────────────┐
│ DevFlow │ 프로젝트 │        사용자 프로필     │
├──────────────────────────────────────────────┤
│                                              │
│  내 프로젝트                   [프로젝트 생성] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ DevFlow 프로젝트                       │  │
│  │ Kubernetes 기반 프로젝트 관리          │  │
│  │ OWNER: 김철수                          │  │
│  │ 프로젝트 생성일: 2026-08-12            │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 프로젝트 이름                          │  │
│  │ 프로젝트 설명                          │  │
│  │ OWNER: 이영희                          │  │
│  │ 프로젝트 생성일: 2026-08-13            │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

프로젝트 카드에 현재 사용자의 `role`, 팀원 수, 업무 수, 페이지 이동 영역을 필수로 표시하지 않는다.

## 9.4 프로젝트 생성 모달

```text
┌──────────────────────────────────┐
│        새 프로젝트 만들기         │
│                                  │
│  프로젝트 이름                   │
│  [                            ]  │
│                                  │
│  프로젝트 설명                   │
│  [                            ]  │
│                                  │
│              [취소] [생성]       │
└──────────────────────────────────┘
```

## 9.5 프로젝트 상세 화면

```text
┌─────────────────────────────────────────────────────────┐
│ DevFlow │ 프로젝트 │                    사용자 프로필   │
├───────────────────┬─────────────────────────────────────┤
│ 프로젝트 멤버      │ ← 프로젝트 목록                    │
│                   │                                     │
│ 김철수 OWNER       │ DevFlow 프로젝트                    │
│ owner@email.com   │ Kubernetes 기반 프로젝트 관리       │
│                   │ OWNER: 김철수                        │
│ 이영희 MEMBER      │ 프로젝트 생성일: 2026-08-12         │
│ member@email.com  │                                     │
│                   │ [새 업무]                            │
│ OWNER일 때만       │                                     │
│ [팀원 등록]        │ 할 일 │ 진행 중 │ 완료               │
│                   │ Task │ Task    │ Task                │
│                   │                                     │
│                   │ Backend Health: UP                   │
│                   │ Service Status: 정상                 │
└───────────────────┴─────────────────────────────────────┘
```

Sidebar에는 멤버와 `OWNER`/`MEMBER` 역할을 표시한다.

프로젝트 정보에는 `최근 업데이트`가 아니라 `프로젝트 생성일(createdAt)`을 표시한다.

상태·담당자 필터와 프로젝트 수정·삭제 버튼은 표시하지 않는다.

## 9.6 팀원 등록 모달

```text
┌──────────────────────────────────┐
│        프로젝트 팀원 등록         │
│                                  │
│  사용자 이메일                   │
│  [ user@example.com           ]  │
│                                  │
│              [취소] [등록]       │
│                                  │
│  오류 메시지 영역                │
└──────────────────────────────────┘
```

이 모달은 OWNER에게만 표시한다.

## 9.7 업무 생성 모달

```text
┌──────────────────────────────────┐
│          새 업무 만들기           │
│                                  │
│  업무 제목                       │
│  [                            ]  │
│                                  │
│  업무 내용                       │
│  [                            ]  │
│                                  │
│  담당자 [ 프로젝트 멤버       ▼] │
│                                  │
│  기본 상태: 할 일                │
│                                  │
│              [취소] [생성]       │
└──────────────────────────────────┘
```

신규 업무 상태는 Backend에서 `TODO`로 설정한다.

## 9.8 업무 상세·상태·담당자 변경 모달

```text
┌──────────────────────────────────┐
│             업무 상세             │
│                                  │
│  업무 제목: 로그인 화면 개발      │
│  업무 내용: 로그인 기능 구현      │
│                                  │
│  담당자 [ 김철수              ▼] │
│  상태   [ 진행 중             ▼] │
│                                  │
│                 [취소] [저장]    │
└──────────────────────────────────┘
```

제목과 내용은 상세 정보로 표시하며 이번 MVP에서는 일반 수정하지 않는다.

상태와 담당자 변경만 저장한다.

삭제 버튼은 표시하지 않는다.

## 9.9 서비스 Health 상태 영역

```text
┌──────────────────────────────────────────────┐
│  Backend Health                              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Backend 상태: UP                       │  │
│  │ 연결 상태: 정상                        │  │
│  │ API: /actuator/health                  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│                            [다시 확인]       │
└──────────────────────────────────────────────┘
```

서비스 상태 영역은 프로젝트 상세 화면 안의 `HealthSection`과 `ServiceStatusPanel`로 구성한다.

`/api/system/status`, 배포 버전, Backend 제공 확인 시간은 표시하지 않는다.

와이어프레임의 최종 형태는 실제 Frontend 구현을 기준으로 한다.

---

# 10. 팀원 협의 및 확인 사항

실제 API 응답과 Frontend 구현을 통해 확정된 사항과 추후 확장이 필요한 사항을 구분하여 관리한다.

## 10.1 확정된 사항

### 인증

- 회원가입: `POST /api/auth/signup`
- 로그인: `POST /api/auth/login`
- 현재 사용자 조회: `GET /api/users/me`
- 인증 Header: `Authorization: Bearer {accessToken}`
- Header 프로필 모달에서 현재 사용자 정보 표시
- 인증 만료 시 저장 정보 제거 후 로그인 이동
- 공통 성공 및 실패 응답 형식 사용

### 프로젝트

- 프로젝트 목록, 생성 및 상세 조회 API 사용
- 프로젝트 생성자가 `OWNER`로 등록
- 목록 응답에는 `role`과 `updatedAt`이 없음
- 목록 응답의 날짜는 `createdAt`
- 상세 응답에는 `createdAt`과 `updatedAt`이 있음
- 상세 화면은 `프로젝트 생성일(createdAt)` 표시
- 프로젝트 수정과 삭제는 이번 MVP 제외
- 프로젝트 목록 페이지네이션은 이번 MVP 제외

### 프로젝트 팀원

- 팀원 등록 시 가입된 사용자의 이메일 전달
- 팀원 등록은 `OWNER`만 가능
- MEMBER에게 팀원 등록 UI 미노출
- 멤버 목록 응답의 `role`로 Sidebar의 `OWNER`/`MEMBER` 표시
- 중복 팀원 등록 불가
- 팀원 삭제는 이번 MVP 제외

### 업무

- 업무 상태값은 `TODO`, `IN_PROGRESS`, `DONE`
- 신규 업무 기본 상태는 `TODO`
- 업무 생성 구현
- 업무 상태 변경 전용 API 구현
- 업무 담당자 변경 전용 API 구현
- 업무 제목·내용 일반 수정 제외
- 업무 삭제 제외
- 업무 목록 페이지네이션 제외
- 상태 및 담당자 필터 제외

### 서비스 상태

- Frontend Health 요청은 `GET /actuator/health` 사용
- 응답의 `status` 표시
- `HealthSection`과 `ServiceStatusPanel`로 화면 분리
- `/api/system/status` 미사용
- 배포 버전과 Backend 제공 `checkedAt` 미사용
- Liveness, Readiness, Prometheus는 Frontend 필수 화면 범위가 아님

### Frontend 구조

- `ProjectDetailPage`에서 Task, Member, Project 정보, Health, Service Status UI 분리
- `TaskBoard`, `HealthSection`, `ProjectInfoPanel`, `MemberPanel`, `ServiceStatusPanel` 사용
- Project, Member, Task, Health 조회 상태와 API 호출 로직을 `useProjectDetailData`로 분리
- 프로젝트 권한 판별과 Task 정규화 로직을 custom util로 분리
- 기존 API 연동과 OWNER/MEMBER 권한 동작 유지

## 10.2 Backend 담당자 후속 확인 사항

- 추후 프로젝트 최근 활동을 위한 `lastActivityAt` 도입 여부
- `lastActivityAt` 도입 시 갱신 대상 이벤트
- 프로젝트 자체 `updatedAt`과 프로젝트 최근 활동 시각의 의미 구분
- 추후 프로젝트 수정·삭제 API를 MVP 범위에 포함할 시점
- 추후 팀원 삭제 API를 화면에 연결할 시점
- 추후 업무 일반 수정·삭제 API를 화면에 연결할 시점
- `/actuator/health`의 배포 환경 공개 범위와 인증 설정

## 10.3 AWS 및 Kubernetes 담당자 확인 사항

- Frontend Service 이름과 포트
- Frontend 컨테이너 포트
- `/` 경로의 Frontend Service 연결
- `/api` 경로의 Backend Service 연결
- `/actuator/health` 경로의 Backend Service 연결
- Ingress에서 `/api` Prefix를 유지할지 제거할지
- 개발 및 운영 도메인 구성
- 환경변수를 이용한 Backend Host 관리 방식
- ConfigMap을 이용한 환경변수 관리 여부

## 10.4 CI/CD 및 Monitoring 담당자 확인 사항

### Frontend 빌드

- Node.js 버전
- 패키지 설치 명령
- Frontend 빌드 명령
- 빌드 결과 폴더
- Lint 및 테스트 명령

예상 명령:

```bash
npm ci
npm run build
```

### 환경변수

- CI/CD Variable 사용 여부
- Docker 빌드 시 환경변수 전달 방식
- 개발 환경과 운영 환경의 값 분리 방식
- 환경변수 변경 시 Docker 이미지 재빌드 여부
- `/api`와 `/actuator/health` Routing 설정

### 배포 확인

- Frontend 접속 확인
- 로그인 및 회원가입 API 연결 확인
- 프로젝트와 업무 API 연결 확인
- OWNER/MEMBER 권한 동작 확인
- 프로젝트 상세의 `프로젝트 생성일(createdAt)` 표시 확인
- `/actuator/health` 연결 확인
- Kubernetes Pod 및 Service 상태 확인

## 10.5 Frontend 내부 결정 사항

- 프로젝트 목록에 응답에 없는 `role`을 표시하지 않음
- 프로젝트 상세 역할은 현재 사용자, `ownerId`, 멤버 목록을 조합해 판별
- Header에 프로필 모달 제공
- 프로젝트 상세 Sidebar에 멤버와 역할 표시
- 프로젝트 상세 날짜 문구는 `프로젝트 생성일` 사용
- 프로젝트 상세 날짜 값은 `createdAt` 사용
- 업무 상태 변경과 담당자 변경만 구현
- 페이지네이션과 필터 미구현
- 프로젝트 수정·삭제, 팀원 삭제, 업무 일반 수정·삭제 미구현
- Health는 `/actuator/health` 사용
- 상세 데이터는 `useProjectDetailData`에서 관리
- 권한 및 Task 정규화는 custom util에서 관리
- 추후 `lastActivityAt` 도입 시 최근 활동 표시 추가

## 10.6 협의 결과 기록 방식

협의 결과는 다음 문서와 작업 항목에 반영한다.

- Frontend 화면 설계서
- Backend API 문서
- GitHub Issue 또는 Pull Request
- Kubernetes 및 배포 구성 문서

추후 범위는 현재 구현 완료 항목과 혼합하지 않고 `후속 구현` 또는 `이번 MVP 제외`로 표시한다.
