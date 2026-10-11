# Kubernetes HPA 및 Self-Healing 검증

## 1. 개요

DevFlow 서비스의 Kubernetes 운영 안정성을 검증하기 위해 Backend를 대상으로 다음 테스트를 수행하였다.

- HPA(Horizontal Pod Autoscaler) Scale-out / Scale-in 테스트
- Kubernetes Pod Self-Healing 테스트
- 실제 API Path 기반 HPA 부하 테스트

단순한 Kubernetes 기능 확인뿐만 아니라 실제 DevFlow API 요청을 이용하여 서비스 트래픽 발생 시에도 HPA가 정상적으로 동작하는지 검증하였다.

---

## 2. 테스트 환경

| 항목 | 설정 |
|---|---|
| Kubernetes | Amazon EKS |
| Namespace | `devflow` |
| 대상 Deployment | `backend` |
| Backend Service | `backend-service` |
| Backend Port | `8080` |
| 기본 Replica | 2 |
| HPA Min Replica | 2 |
| HPA Max Replica | 4 |
| HPA CPU Target | 70% |

테스트 시작 전 Backend 상태:

```text
NAME      READY   UP-TO-DATE   AVAILABLE
backend   2/2     2            2
```

HPA 상태:

```text
NAME          REFERENCE            TARGETS       MINPODS   MAXPODS   REPLICAS
backend-hpa   Deployment/backend   cpu: 0%/70%   2         4         2
```

Backend CPU 사용량:

```text
backend-865f6f5b8-sfwzz   2m   291Mi
backend-865f6f5b8-twb44   2m   289Mi
```

---

## 3. HPA 기본 동작 검증

### 3.1 테스트 목적

Backend의 CPU 사용률이 HPA Target을 초과했을 때 Pod가 자동으로 증가하고, 부하가 제거되었을 때 다시 최소 Replica 수로 감소하는지 검증하였다.

### 3.2 Scale-out

Backend에 부하를 발생시킨 결과 CPU 사용률이 HPA Target인 70%를 초과하였다.

테스트 과정에서 다음과 같은 CPU 사용률이 확인되었다.

```text
56% / 70%
133% / 70%
147% / 70%
107% / 70%
```

이에 따라 Backend Replica가 자동으로 증가하였다.

```text
2 → 4
```

### 3.3 Scale-in

부하를 제거한 후 Backend CPU 사용률이 다시 약 0~1% 수준으로 감소하였다.

HPA 안정화 시간 이후 Backend Replica가 자동으로 감소하였다.

```text
4 → 2
```

최종 Deployment 상태:

```text
NAME      READY   UP-TO-DATE   AVAILABLE
backend   2/2     2            2
```

### 3.4 결과

| 검증 항목 | 결과 |
|---|---|
| CPU Metric 수집 | PASS |
| HPA Target 감지 | PASS |
| Scale-out | PASS (`2 → 4`) |
| Scale-in | PASS (`4 → 2`) |
| 최종 Replica 복구 | PASS (`2`) |

**결과: PASS**

---

## 4. Kubernetes Self-Healing 검증

### 4.1 테스트 목적

실행 중인 Backend Pod에 장애가 발생했을 때 Kubernetes Deployment Controller가 새로운 Pod를 자동 생성하여 설정된 Replica 수를 유지하는지 검증하였다.

### 4.2 장애 발생

실행 중인 Backend Pod 하나를 강제로 삭제하였다.

```bash
kubectl delete pod backend-84d4b6bd6b-4sxqn -n devflow
```

### 4.3 자동 복구

Pod 삭제 이후 Kubernetes가 새로운 Backend Pod를 자동으로 생성하였다.

```text
backend-84d4b6bd6b-vpnt9   0/1   Running
```

이후 신규 Pod가 정상적으로 Ready 상태로 전환되었다.

```text
backend-84d4b6bd6b-vpnt9   1/1   Running
```

최종 Deployment 상태:

```text
NAME      READY   UP-TO-DATE   AVAILABLE
backend   2/2     2            2
```

### 4.4 결과

| 검증 항목 | 결과 |
|---|---|
| Backend Pod 강제 삭제 | PASS |
| 신규 Pod 자동 생성 | PASS |
| 신규 Pod Ready 전환 | PASS |
| Replica 자동 복구 | PASS (`2/2`) |

**결과: PASS**

---

## 5. 실제 API Path 기반 HPA 테스트

### 5.1 테스트 목적

기존 HPA 테스트에서 한 단계 더 나아가 실제 DevFlow 서비스에서 사용하는 API Path에 지속적인 HTTP 요청을 발생시켜 실제 서비스 트래픽 환경에서도 HPA가 정상적으로 동작하는지 검증하였다.

테스트 대상 API는 다음과 같다.

```http
GET /api/projects
```

해당 API는 JWT 인증이 필요한 Backend API이다.

---

### 5.2 인증 확인

인증 정보 없이 `/api/projects`를 호출한 결과 다음과 같이 접근이 차단되는 것을 확인하였다.

```text
HTTP/1.1 403
```

따라서 실제 서비스 요청과 동일하게 로그인 API를 이용하여 JWT Access Token을 발급하였다.

```http
POST /api/auth/login
```

로그인 성공:

```json
{
  "success": true,
  "message": "로그인에 성공했습니다.",
  "data": {
    "accessToken": "***",
    "tokenType": "Bearer"
  }
}
```

> 실제 JWT Access Token과 테스트 계정 비밀번호는 보안상 저장소 및 테스트 문서에 기록하지 않는다.

---

### 5.3 실제 API 정상 호출 확인

발급받은 JWT를 Bearer Token으로 전달하여 프로젝트 조회 API를 호출하였다.

```http
GET /api/projects
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```text
HTTP/1.1 200
Content-Type: application/json
```

```json
{
  "success": true,
  "message": "프로젝트 목록 조회에 성공했습니다.",
  "data": []
}
```

이를 통해 실제 인증된 API 요청이 정상적으로 Backend에서 처리되는 것을 확인하였다.

---

### 5.4 API 부하 발생

Kubernetes 내부 테스트 Pod에서 다음 요청을 지속적으로 발생시켰다.

```text
GET /api/projects
Authorization: Bearer <ACCESS_TOKEN>
```

테스트 흐름:

```text
Load Pod
   ↓
GET /api/projects
   ↓
JWT 인증
   ↓
Backend API 처리
   ↓
CPU 사용률 증가
   ↓
HPA Scale-out
```

---

### 5.5 HPA Scale-out 결과

테스트 시작 전 HPA 상태:

```text
cpu: 2%/70%
Replicas: 2
```

API 요청 발생 후 CPU 사용률이 HPA Target인 70%를 초과하였다.

```text
cpu: 2%/70%      Replicas: 2
cpu: 103%/70%    Replicas: 2
cpu: 92%/70%     Replicas: 3
cpu: 86%/70%     Replicas: 3
cpu: 78%/70%     Replicas: 3
```

지속적인 API 요청에 따라 Backend Pod는 최종적으로 4개까지 증가하였다.

```text
Backend Replica

2 → 3 → 4
```

Scale-out 이후 Backend Pod 4개가 모두 정상적으로 Running 상태인 것을 확인하였다.

**Scale-out 결과: PASS**

---

### 5.6 HPA Scale-in 결과

API 부하가 종료된 후 Backend CPU 사용률이 약 1% 수준으로 감소하였다.

```text
cpu: 1%/70%   Replicas: 4
cpu: 1%/70%   Replicas: 4
cpu: 1%/70%   Replicas: 3
cpu: 1%/70%   Replicas: 3
cpu: 1%/70%   Replicas: 2
```

HPA 안정화 시간 이후 Backend Replica가 단계적으로 감소하였다.

```text
4 → 3 → 2
```

최종 Backend Pod:

```text
backend-865f6f5b8-sfwzz   1/1   Running
backend-865f6f5b8-twb44   1/1   Running
```

**Scale-in 결과: PASS**

---

### 5.7 실제 API Path 기반 테스트 결과

| 검증 항목 | 결과 |
|---|---|
| 대상 API | `GET /api/projects` |
| 인증 방식 | JWT Bearer Token |
| 비인증 요청 | `403 Forbidden` |
| 인증 요청 | `HTTP 200` |
| 실제 API 반복 요청 | PASS |
| HPA CPU Target | 70% |
| 테스트 중 최대 확인 CPU | 103% |
| Scale-out | PASS (`2 → 3 → 4`) |
| 부하 제거 후 CPU | 약 1% |
| Scale-in | PASS (`4 → 3 → 2`) |
| 최종 Backend Replica | 2 |
| 최종 결과 | **PASS** |

---

## 6. 종합 결과

이번 테스트를 통해 DevFlow Kubernetes 환경에서 다음 기능이 정상적으로 동작하는 것을 확인하였다.

| 테스트 | 결과 |
|---|---|
| Kubernetes Metrics 수집 | PASS |
| HPA Scale-out | PASS |
| HPA Scale-in | PASS |
| Pod Self-Healing | PASS |
| Deployment Replica 자동 복구 | PASS |
| JWT 인증 API 호출 | PASS |
| 실제 API Path 기반 HPA Scale-out | PASS |
| 실제 API Path 기반 HPA Scale-in | PASS |

---

## 7. 결론

DevFlow Backend는 Kubernetes HPA를 통해 CPU 부하 증가 시 Pod 수를 자동으로 확장하고, 부하 감소 후 다시 최소 Replica 수로 축소되는 것을 확인하였다.

또한 Backend Pod를 강제로 삭제하는 장애 상황에서도 Kubernetes Deployment Controller가 새로운 Pod를 자동 생성하여 목표 Replica 수를 복구하는 Self-Healing 동작을 확인하였다.

추가적으로 실제 DevFlow 서비스에서 사용하는 `GET /api/projects` API를 대상으로 JWT 인증을 포함한 지속적인 요청을 발생시킨 결과, Backend CPU 사용률이 HPA Target인 70%를 초과하면서 Backend Pod가 `2 → 3 → 4`로 Scale-out 되었다.

부하 종료 후 CPU 사용률이 약 1%로 감소하면서 Pod 역시 `4 → 3 → 2`로 자동 Scale-in 되었다.

이를 통해 단순한 Kubernetes 기능 검증뿐만 아니라 **실제 애플리케이션 API 트래픽 상황에서도 HPA와 Kubernetes의 자동 복구 기능이 정상적으로 동작함을 확인하였다.**
