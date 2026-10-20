# DevFlow 3차 프로젝트 - AWS 및 Kubernetes 확장 아키텍처 설계

## 1. 최종 결정 요약

DevFlow 3차 프로젝트는 2차 MVP에서 구축한 AWS EKS 기반 인프라를 확장하여 GitOps 기반 자동 배포, Frontend 정적 호스팅, 데이터베이스 고가용성, 중앙 로그 관리 및 운영 자동화를 도입한다.

| 항목 | 3차 프로젝트 설계 |
|---|---|
| AWS Region | `ap-northeast-1` (Tokyo) |
| Availability Zone | 1개 Region, 2개 AZ |
| VPC | `10.0.0.0/16` |
| Kubernetes | Amazon EKS |
| Frontend | Amazon S3 + CloudFront |
| Backend | EKS Deployment, Replica 2 |
| Container Registry | GitLab Container Registry |
| GitLab | GitLab + Runner + Registry 단일 EC2 |
| CI | GitLab CI/CD |
| CD | Argo CD 기반 GitOps |
| Kubernetes 패키지 관리 | Helm |
| GitOps Repository | GitLab 별도 Repository |
| RDS | PostgreSQL Multi-AZ, Private Access |
| 외부 진입점 | Route 53 + CloudFront + ALB |
| 파일 저장소 | S3 Attachment Bucket |
| 모니터링 | Prometheus + Grafana |
| 로그 수집 | Loki + Promtail |
| 알림 | Alertmanager + Slack/Email |
| Kubernetes API | Backend에서 제한된 권한으로 연동 |
| HPA | Backend CPU 60%, min 2, max 6 |
| 배포 전략 | GitOps 기반 RollingUpdate |
| 롤백 | GitOps Repository의 이전 배포 상태 복원 |

기존 VPC와 Subnet 구조는 유지하며, EKS Backend와 PostgreSQL 데이터베이스를 중심으로 확장한다.

## 2. EKS 유지 및 3차 확장 근거

### EKS 유지 근거

- 2차 프로젝트에서 구축한 AWS VPC, Subnet, Security Group, ALB, RDS, IAM 및 Kubernetes 운영 환경을 재사용한다.
- EKS 환경을 유지하여 인프라 재구축 없이 배포 자동화와 운영 기능을 확장한다.
- Kubernetes API 연동을 통해 Pod 상태 및 배포 정보를 애플리케이션에서 조회할 수 있도록 한다.
- HPA와 Multi-AZ Node 구성을 유지하여 Backend 서비스의 확장성과 장애 대응 능력을 확보한다.

### 3차 아키텍처 확장 목적

**1. Frontend 분리**

Frontend를 EKS에서 제거하고 S3와 CloudFront로 이전한다.

- Frontend Pod 및 관련 Kubernetes 리소스 제거
- 정적 파일 배포 구조로 전환
- CDN 캐싱을 통한 정적 콘텐츠 제공 성능 개선
- EKS의 Frontend 관련 리소스 사용량 감소

**2. GitOps 기반 배포**

기존 GitLab Runner의 Kubernetes 직접 배포를 Argo CD 기반 GitOps 방식으로 변경한다.

- GitLab Runner: Build, Test, Image Push, GitOps Repository 업데이트
- Argo CD: GitOps Repository 감시 및 Kubernetes 상태 동기화
- Helm: Kubernetes 애플리케이션 배포 설정 관리
- GitOps Repository: 배포 설정의 단일 기준(Source of Truth)

**3. 고가용성 및 운영 기능 강화**

- RDS PostgreSQL Multi-AZ 적용
- Loki/Promtail 기반 중앙 로그 수집
- Alertmanager를 통한 Slack/Email 알림
- 배포 이력 및 파이프라인 실행 이력 조회
- Kubernetes Pod 상태 조회
- 수동 배포 및 롤백 기능 제공

## 3. AWS 아키텍처

```text
AWS Region: ap-northeast-1
│
├── Route 53
│   ├── DevFlow Domain → CloudFront
│   └── GitLab Domain → GitLab EC2
│
├── CloudFront
│   ├── /* → S3 Frontend Bucket
│   └── /api/* → Application Load Balancer
│
├── S3
│   ├── Frontend Bucket
│   │   └── React 정적 파일
│   └── Attachment Bucket
│       └── 사용자 첨부파일
│
└── VPC: 10.0.0.0/16
    │
    ├── Availability Zone A
    │   ├── Public Subnet A
    │   │   ├── ALB
    │   │   ├── NAT Gateway
    │   │   └── GitLab EC2
    │   │       ├── GitLab
    │   │       ├── GitLab Runner
    │   │       └── Container Registry
    │   │
    │   ├── Private App Subnet A
    │   │   └── EKS Worker Node
    │   │
    │   └── Private DB Subnet A
    │       └── RDS Primary
    │
    ├── Availability Zone B
    │   ├── Public Subnet B
    │   │   └── ALB
    │   │
    │   ├── Private App Subnet B
    │   │   └── EKS Worker Node
    │   │
    │   └── Private DB Subnet B
    │       └── RDS Standby
    │
    ├── EKS Cluster
    │   ├── devflow Namespace
    │   │   ├── Backend Deployment
    │   │   ├── Backend Service
    │   │   ├── Ingress
    │   │   ├── HPA
    │   │   ├── ConfigMap
    │   │   ├── Secret
    │   │   └── ServiceAccount / RBAC
    │   │
    │   ├── GitOps
    │   │   └── Argo CD
    │   │
    │   └── monitoring Namespace
    │       ├── Prometheus
    │       ├── Grafana
    │       ├── Loki
    │       ├── Promtail
    │       └── Alertmanager
    │
    └── RDS PostgreSQL Multi-AZ
        ├── Primary Database
        └── Synchronous Standby
```

참고 사항:

- CloudFront와 Route 53은 VPC 내부 리소스가 아니라 AWS 관리형 서비스이다.
- S3 Bucket 역시 VPC 내부에 배치되는 리소스가 아니다.
- RDS Primary/Standby의 AZ 위치는 장애 조치 이후 변경될 수 있다.
- Argo CD는 EKS 내부에서 GitOps Repository를 감시하고 배포 상태를 동기화한다.

## 4. VPC 및 Subnet

기존 2차 프로젝트에서 사용한 네트워크 주소 체계를 유지한다.

| 영역 | AZ-A | AZ-B |
|---|---|---|
| Public | `10.0.1.0/24` | `10.0.2.0/24` |
| Private App | `10.0.10.0/24` | `10.0.11.0/24` |
| Private DB | `10.0.20.0/24` | `10.0.21.0/24` |

### Public Subnet

- Application Load Balancer
- GitLab EC2
- NAT Gateway

### Private App Subnet

- EKS Worker Node
- Backend Pod
- Argo CD
- Monitoring Components

### Private DB Subnet

- RDS PostgreSQL Primary
- RDS PostgreSQL Standby

### NAT Gateway

기존 2차 프로젝트의 비용 절감 정책에 따라 NAT Gateway 1개 구성을 유지한다.

단, 단일 NAT Gateway 구성은 완전한 AZ 고가용성을 보장하지 않는다. NAT Gateway가 위치한 AZ에 장애가 발생하면 다른 AZ의 Private Subnet에서도 외부 통신 장애가 발생할 수 있다.

## 5. Security Group 및 접근 제어

| 리소스 | 허용 트래픽 |
|---|---|
| CloudFront | 사용자 HTTPS 요청 처리 |
| ALB SG | CloudFront에서 전달되는 HTTPS 트래픽 |
| GitLab SG | GitLab HTTPS 및 필요한 Registry 접근 |
| EKS Node/Pod SG | ALB 및 필요한 클러스터 내부 통신 |
| RDS SG | Backend가 사용하는 DB 접근 경로에서 TCP 5432 |
| Attachment S3 | 필요한 IAM 권한을 가진 애플리케이션 접근 |

### 보안 정책

- Backend Pod는 Private App Subnet에서 실행한다.
- RDS는 Public Access를 비활성화한다.
- GitLab 관리 접속에는 SSM을 우선 사용한다.
- ALB는 CloudFront에서 전달되는 API 요청을 처리한다.
- S3 Frontend Bucket은 직접 공개하지 않고 CloudFront OAC를 사용한다.
- Attachment Bucket의 Public Access를 차단한다.
- Kubernetes API 접근은 ServiceAccount와 RBAC로 제한한다.
- 애플리케이션 사용자 권한과 Kubernetes 권한을 분리한다.

실제 Node/Pod Security Group 규칙은 ALB Target Type과 EKS 네트워크 구성에 맞춰 적용한다.

## 6. RDS PostgreSQL Multi-AZ

3차 프로젝트에서는 기존 Single-AZ PostgreSQL을 Multi-AZ 구성으로 확장한다.

| 항목 | 설정 |
|---|---|
| Engine | PostgreSQL |
| Deployment | Multi-AZ DB Instance |
| Primary | AZ-A 또는 AZ-B |
| Standby | Primary와 다른 AZ |
| DB Subnet Group | Private DB Subnet A/B |
| Public Access | Disabled |
| Storage Encryption | Enabled |
| Automated Backup | Enabled |
| Application Connection | RDS Endpoint 사용 |
| Database Port | 5432 |

### Multi-AZ 동작

```text
Backend Pods
     │
     ▼
RDS Endpoint
     │
     ▼
Primary Database
     │
     │ Synchronous Replication
     ▼
Standby Database
```

- Primary와 Standby를 서로 다른 AZ에 구성한다.
- Primary 장애 발생 시 AWS가 Standby로 장애 조치를 수행한다.
- 애플리케이션은 RDS Endpoint를 사용한다.
- 기존 연결은 장애 조치 과정에서 끊어질 수 있으므로 재연결이 필요하다.
- Standby는 일반 읽기 전용 트래픽을 처리하는 Read Replica가 아니다.

Multi-AZ는 데이터베이스 가용성 강화가 목적이며, 별도의 읽기 성능 확장 기능으로 취급하지 않는다.

## 7. Kubernetes Namespace

| Namespace | 관리 대상 |
|---|---|
| `devflow` | Backend 및 애플리케이션 리소스 |
| `argocd` | Argo CD 및 GitOps 관리 |
| `monitoring` | Prometheus, Grafana, Loki, Promtail, Alertmanager |
| `kube-system` | Metrics Server, AWS Load Balancer Controller 등 |

### devflow Namespace

```text
devflow/
├── Backend Deployment
├── Backend Service
├── Ingress
├── HPA
├── ConfigMap
├── Secret
├── ServiceAccount
├── Role
└── RoleBinding
```

3차에서는 Frontend Deployment, Service 및 HPA를 사용하지 않는다.

Frontend는 S3 + CloudFront로 제공한다.

## 8. Frontend / Backend 구성

| 항목 | Frontend | Backend |
|---|---|---|
| 실행 환경 | S3 + CloudFront | Amazon EKS |
| 애플리케이션 | React | Spring Boot |
| Replica | 해당 없음 | 2 |
| Kubernetes Service | 해당 없음 | ClusterIP 8080 |
| RollingUpdate | 정적 파일 배포 | maxUnavailable 0, maxSurge 1 |
| HPA | 해당 없음 | CPU 60%, min 2, max 6 |
| 외부 통신 | HTTPS / CloudFront | CloudFront → ALB → Backend |
| 로그 | CDN/접근 로그 별도 구성 가능 | Loki/Promtail |
| 배포 방식 | GitLab CI → S3 | GitLab CI → GitOps → Argo CD |

### Frontend 배포

```text
Developer Push
       ↓
GitLab CI
       ↓
Frontend Build
       ↓
S3 Upload
       ↓
CloudFront Cache Invalidation
       ↓
User Access
```

- React 프로젝트를 빌드하여 정적 파일을 생성한다.
- GitLab CI에서 생성한 파일을 S3에 업로드한다.
- 필요한 경우 CloudFront 캐시를 무효화한다.
- 사용자 요청은 CloudFront를 통해 처리한다.

### Backend 배포

```text
Developer Push
       ↓
GitLab Runner
       ↓
Test & Docker Build
       ↓
GitLab Container Registry
       ↓
GitOps Repository Update
       ↓
Argo CD Sync
       ↓
EKS Deployment Update
```

- Backend 이미지를 GitLab Container Registry에 저장한다.
- GitOps Repository의 배포 이미지 버전을 갱신한다.
- Argo CD가 변경 사항을 감지하여 Kubernetes에 반영한다.
- EKS Worker Node가 Registry에서 새 이미지를 가져온다.

## 9. Ingress 및 서비스 요청 흐름

3차에서는 사용자의 기본 진입점이 CloudFront로 변경된다.

### CloudFront Routing

| 요청 경로 | 대상 | 설명 |
|---|---|---|
| `/` | S3 Frontend | React 메인 페이지 |
| `/*` | S3 Frontend | 정적 리소스 및 SPA 경로 |
| `/api/*` | ALB | Spring Boot Backend API |

### 서비스 요청 흐름

```text
User
 │
 ▼
Route 53
 │
 ▼
CloudFront
 │
 ├── /*
 │     │
 │     ▼
 │   S3 Frontend
 │
 └── /api/*
       │
       ▼
      ALB
       │
       ▼
   EKS Ingress
       │
       ▼
  Backend Service
       │
       ▼
   Backend Pods
       │
       ▼
  RDS PostgreSQL
```

### Ingress 설정 원칙

- `/api/*` 요청을 Backend Service의 8080 포트로 전달한다.
- 기존 Frontend Ingress 경로는 제거한다.
- `/actuator/prometheus`는 외부에 공개하지 않는다.
- Prometheus가 클러스터 내부에서 Backend Metrics를 수집한다.
- CloudFront의 API 경로는 캐시를 비활성화하고 인증에 필요한 헤더, 쿠키 및 HTTP 메서드를 올바르게 전달하도록 설정한다.
- CloudFront와 ALB Origin 사이에도 HTTPS를 적용한다.
- SPA 라우팅을 위한 정적 페이지 오류 처리는 API 응답에 영향을 주지 않도록 구성한다.

## 10. ConfigMap / Secret

### ConfigMap

- `SPRING_PROFILES_ACTIVE`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `SERVER_PORT`
- `JWT_EXPIRATION`
- `CORS_ALLOWED_ORIGINS`
- `APP_VERSION`
- `MANAGEMENT_ENDPOINTS`

### Secret

- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- GitLab Container Registry `imagePullSecret`

### 변경 사항

- Frontend는 Kubernetes ConfigMap/Secret을 사용하지 않는다.
- Backend는 기존 Kubernetes ConfigMap/Secret 설정을 유지한다.
- RDS 접속 정보는 Private Endpoint를 기준으로 설정한다.
- GitOps Repository에 평문 Secret 값을 저장하지 않는다.
- S3 Attachment 접근 권한은 가능한 한 IAM Role 기반으로 관리한다.

## 11. Probe 및 상태 확인

Frontend가 EKS에서 제거되므로 Kubernetes Probe는 Backend에 적용한다.

| Probe | Backend 경로 |
|---|---|
| Startup | `/actuator/health/liveness` |
| Liveness | `/actuator/health/liveness` |
| Readiness | `/actuator/health/readiness` |

### Backend 상태 확인

- Startup Probe로 애플리케이션 초기 구동을 확인한다.
- Liveness Probe로 프로세스의 정상 동작 여부를 확인한다.
- Readiness Probe로 트래픽 처리 가능 여부를 판단한다.
- DB 장애는 Liveness가 아닌 Readiness에서 판단하도록 구성한다.

단, DB 연결 상태가 Readiness에 반영되는지는 실제 Spring Boot Health Group 설정으로 검증해야 한다.

### Frontend 상태 확인

- CloudFront를 통한 정적 페이지 접근
- 주요 JavaScript/CSS 리소스 응답 확인
- Frontend에서 Backend API 호출 정상 여부 확인

## 12. Resource 및 HPA

Frontend가 EKS에서 제거됨에 따라 Backend 리소스를 중심으로 관리한다.

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---:|---:|---:|---:|
| Backend | 250m | 1000m | 512Mi | 1Gi |

위 값은 기존 2차 설정을 유지한 기준값이다.

### Backend HPA

```yaml
minReplicas: 2
maxReplicas: 6

metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

### HPA 동작

- 최소 Backend Pod 2개 유지
- CPU 사용률을 기준으로 최대 6개까지 확장
- Metrics Server를 통한 리소스 사용량 수집
- 트래픽 감소 시 설정된 정책에 따라 축소

HPA는 Pod 개수를 조정하며, Worker Node의 자동 증설까지 보장하지 않는다.

## 13. ServiceAccount / RBAC

3차 프로젝트에서는 Kubernetes API 연동 기능이 추가되므로 기존 RBAC 설계를 확장한다.

### Kubernetes RBAC

| ServiceAccount | 권한 |
|---|---|
| `backend-sa` | 필요한 Kubernetes 리소스에 대한 최소 조회/작업 권한 |
| `argocd` 관련 ServiceAccount | Argo CD 애플리케이션 배포 및 상태 동기화 권한 |
| GitLab CI 자격 증명 | Registry 및 GitOps Repository 작업에 필요한 권한 |

### Backend Kubernetes API 연동

Backend는 애플리케이션 운영 기능을 제공하기 위해 Kubernetes API와 통신한다.

주요 기능:

- Pod 상태 조회
- Deployment 상태 조회
- Namespace 내 리소스 상태 조회
- 애플리케이션 로그 조회를 위한 제한된 접근

### 권한 분리 원칙

- 일반 사용자 요청으로 Kubernetes 전체 관리자 권한을 실행하지 않는다.
- Backend의 조회 권한과 배포 변경 권한을 분리한다.
- Kubernetes `cluster-admin`을 Backend에 부여하지 않는다.
- 수동 배포 및 롤백은 GitOps 변경을 통해 수행한다.
- Argo CD가 GitOps Repository의 선언 상태를 기준으로 배포를 관리한다.

### 애플리케이션 RBAC

DevFlow 애플리케이션 자체의 프로젝트별 사용자 권한과 Kubernetes RBAC는 별도로 관리한다.

- 프로젝트 관리자
- 프로젝트 멤버
- 일반 사용자

실제 역할별 기능 접근 범위는 애플리케이션 권한 정책에 따라 결정한다.

## 14. GitLab CI/CD 및 GitOps

### 기존 2차 방식

```text
Developer
    ↓
GitLab
    ↓
GitLab Runner
    ↓
Docker Build
    ↓
Container Registry
    ↓
kubectl apply
    ↓
EKS
```

### 변경된 3차 방식

```text
Developer
    │
    ▼
GitLab Application Repository
    │
    ▼
GitLab Runner
    │
    ├── Test
    ├── Build
    └── Docker Build
           │
           ▼
   GitLab Container Registry
           │
           ▼
   GitOps Repository Update
           │
           ▼
       Argo CD
           │
           ▼
       Helm Render
           │
           ▼
     EKS Deployment
           │
           ▼
     Backend Pods
```

### GitOps Repository

GitOps Repository는 애플리케이션의 Kubernetes 배포 상태를 관리한다.

관리 대상:

- Helm Chart 또는 Helm Values
- Backend 이미지 버전
- Replica 및 Resource 설정
- Service 및 Ingress
- HPA
- ConfigMap
- 필요한 Kubernetes Manifest

### Argo CD

- GitOps Repository의 변경 사항 감지
- Kubernetes 현재 상태와 선언된 상태 비교
- 배포 설정 동기화
- 애플리케이션 동기화 상태 확인
- 배포 실패 및 Drift 상태 확인

### 수동 배포 / 롤백

- 사용자가 DevFlow UI에서 배포 또는 롤백을 요청한다.
- Backend는 사용자 권한을 확인한다.
- 승인된 배포 작업이 GitOps Repository의 목표 상태를 변경한다.
- Argo CD가 변경된 상태를 EKS에 반영한다.
- 배포 결과와 이력을 애플리케이션에서 조회한다.

GitOps 관리 대상 리소스를 Backend가 임의로 직접 수정하는 방식은 사용하지 않는다.

롤백도 GitOps Repository의 이전 정상 배포 상태를 복원하는 방식으로 일관성을 유지한다.

## 15. 모니터링 및 중앙 로그 시스템

3차 프로젝트에서는 기존 Prometheus/Grafana에 Loki/Promtail과 Alertmanager를 추가한다.

### 구성 요소

| Component | 역할 |
|---|---|
| Prometheus | Metrics 수집 및 저장 |
| Grafana | Metrics 및 Log 시각화 |
| Loki | 중앙 로그 저장 및 조회 |
| Promtail | Pod/Container 로그 수집 |
| Alertmanager | 알림 관리 및 전달 |
| Metrics Server | Kubernetes 리소스 사용량 수집 |
| kube-state-metrics | Kubernetes 리소스 상태 Metrics |
| node-exporter | Node 시스템 Metrics |

### Metrics 흐름

```text
Backend / EKS
      │
      ▼
Prometheus
      │
      ▼
Grafana
```

### Log 흐름

```text
Backend Pods
      │
      ▼
   Promtail
      │
      ▼
     Loki
      │
      ▼
   Grafana
```

### Alert 흐름

```text
Prometheus
     │
     ▼
Alertmanager
     │
     ├── Slack
     │
     └── Email
```

### 모니터링 대상

- Backend Pod CPU/Memory 사용률
- Pod Ready 및 Restart 상태
- Kubernetes Deployment 상태
- Backend API 응답 상태
- 애플리케이션 오류
- Backend 로그
- EKS Node 리소스 상태

### 알림 기능

- Pod 장애
- Backend 서비스 장애
- 리소스 사용률 임계치 초과
- 배포 장애
- 정의된 Prometheus Alert 발생

Prometheus/Alertmanager 기반 인프라 알림과 애플리케이션의 배포 결과 알림은 발생 주체를 구분하여 처리한다.

## 16. S3 파일 저장소

3차 프로젝트에서는 S3를 두 가지 용도로 사용한다.

### Frontend Bucket

- React Build Artifact 저장
- CloudFront Origin 역할
- 정적 콘텐츠 제공
- OAC 기반 접근 제한

### Attachment Bucket

- 프로젝트 첨부파일 저장
- 댓글 및 프로젝트 관련 파일 관리
- Backend API를 통한 접근 권한 검사
- IAM 권한에 따른 업로드/다운로드

### 파일 업로드 흐름

```text
User
  │
  ▼
CloudFront
  │
  ▼
ALB
  │
  ▼
Backend API
  │
  ├── 사용자 권한 검사
  │
  ├── 파일 메타데이터 관리
  │
  └── S3 Attachment Bucket
```

파일 본문은 S3에 저장하고, 프로젝트와 연결되는 파일 메타데이터는 애플리케이션 데이터베이스에서 관리한다.

파일 다운로드 또는 내보내기는 Backend의 권한 검사를 거쳐 허용한다.

## 17. 3차 추가 애플리케이션 기능

| 기능 | 설명 | 주요 연동 |
|---|---|---|
| 세부 권한(RBAC) | 프로젝트별 사용자 권한 관리 | Backend / PostgreSQL |
| 댓글 | 프로젝트 및 이슈 관련 댓글 | Backend / PostgreSQL |
| 파일 첨부 | 파일 업로드 및 다운로드 | Backend / S3 |
| 마감일/우선순위 | 작업 일정 및 우선순위 관리 | Backend / PostgreSQL |
| 초대 링크/메일 | 프로젝트 멤버 초대 | Backend / Email |
| 배포 이력 | 애플리케이션 배포 기록 조회 | GitOps / Backend |
| 파이프라인 이력 | GitLab CI 실행 결과 조회 | GitLab API |
| Kubernetes API 연동 | 클러스터 리소스 조회 | Kubernetes API |
| Pod 상태 실시간 조회 | Pod 상태 정보 갱신 및 표시 | Kubernetes API |
| 수동 배포/롤백 | 배포 실행 및 이전 상태 복원 | GitOps / Argo CD |
| 로그 조회 | 애플리케이션 로그 조회 | Loki |
| 알림 | 장애 및 운영 이벤트 알림 | Alertmanager / Slack / Email |

### 기능 연동 원칙

- 프로젝트 데이터는 PostgreSQL에서 관리한다.
- 첨부파일은 S3에 저장한다.
- CI 실행 정보는 GitLab API를 통해 조회한다.
- Kubernetes 상태는 Kubernetes API를 통해 조회한다.
- 로그는 Loki를 통해 조회한다.
- 배포 변경은 GitOps Repository를 중심으로 관리한다.
- 사용자별 기능 접근은 Backend에서 권한을 검증한다.

## 18. Pod 장애 복구 및 고가용성 테스트

### Backend Pod 장애 복구

1. Backend Pod 2개와 Node 배치를 기록한다.
2. Pod 1개를 삭제한다.
3. Kubernetes Deployment Controller가 새 Pod를 생성하는지 확인한다.
4. 새 Pod가 Ready 상태로 전환되는지 확인한다.
5. Replica가 2개로 복구되는지 확인한다.
6. 테스트 중 Backend API 응답 여부를 확인한다.
7. Prometheus/Grafana에서 관련 Metrics를 확인한다.
8. Loki에서 Pod 관련 로그를 확인한다.
9. 장애와 복구 시각 및 서비스 영향 여부를 기록한다.

### RDS Multi-AZ 검증

1. RDS Multi-AZ 구성 상태를 확인한다.
2. Primary와 Standby가 서로 다른 AZ에 구성되었는지 확인한다.
3. 자동 백업 설정을 확인한다.
4. 허용된 테스트 환경에서 Failover 동작을 확인한다.
5. Failover 후 Backend DB 연결 복구 여부를 확인한다.

### GitOps 배포 검증

1. 애플리케이션 코드 변경
2. GitLab Pipeline 실행
3. Container Registry 이미지 확인
4. GitOps Repository 변경 확인
5. Argo CD Sync 상태 확인
6. EKS Deployment 업데이트 확인
7. Backend API 정상 응답 확인
8. 이전 정상 버전으로 롤백 테스트

### Frontend 배포 검증

1. Frontend Build 실행
2. S3 정적 파일 업로드 확인
3. CloudFront 콘텐츠 제공 확인
4. Frontend API 요청이 ALB로 전달되는지 확인
5. 기존 Frontend Pod 제거 상태 확인

## 19. Terraform 및 배포 관리 역할

### Terraform 관리 대상

Terraform은 AWS 인프라의 선언적 구성을 담당한다.

```text
terraform/
├── modules/
│   ├── network/
│   ├── security/
│   ├── gitlab/
│   ├── eks/
│   ├── rds/
│   └── monitoring/
└── environments/
    └── dev/
```

위 디렉터리는 기존 2차 프로젝트의 구조를 기준으로 하며, 실제 저장소 변경 여부는 별도로 확인한다.

3차 확장에 따라 Terraform 관리 범위에는 다음 AWS 리소스가 포함될 수 있다.

- RDS Multi-AZ 설정
- Frontend S3 Bucket
- Attachment S3 Bucket
- CloudFront Distribution
- Route 53 DNS 설정
- 필요한 IAM 및 Security Group 설정

### GitOps / Helm 관리 대상

- Backend Deployment
- Backend Service
- Ingress
- HPA
- ConfigMap
- Kubernetes RBAC
- Argo CD Application 설정
- Kubernetes Monitoring Components

### 역할 분리

| 도구 | 담당 영역 |
|---|---|
| Terraform | AWS 인프라 생성 및 변경 |
| GitLab CI | 코드 테스트, 빌드, 이미지 생성 및 배포 준비 |
| GitLab Container Registry | Container Image 보관 |
| GitOps Repository | Kubernetes 배포 목표 상태 관리 |
| Helm | Kubernetes Manifest 템플릿 및 설정 |
| Argo CD | Kubernetes 배포 상태 동기화 |
| Kubernetes | 애플리케이션 실행 및 복구 |
| Prometheus/Grafana | Metrics 수집 및 시각화 |
| Loki/Promtail | 로그 수집 및 조회 |
| Alertmanager | 인프라 알림 전송 |

GitLab CI가 Argo CD 관리 대상 Kubernetes 리소스에 직접 `kubectl apply`를 수행하지 않도록 역할을 분리한다.

---

## 20. 최종 아키텍처 요약

DevFlow 3차 프로젝트는 기존 2차 EKS 기반 인프라를 유지하면서 배포 자동화, 사용자 기능, 모니터링 및 고가용성을 확장한다.

### 핵심 변경 사항

1. **Frontend 아키텍처 변경:** EKS Frontend Deployment를 제거하고 Amazon S3 + CloudFront로 이전한다.
2. **GitOps 도입:** GitLab CI와 Argo CD, Helm을 연동하여 선언적 배포 구조를 구성한다.
3. **RDS 고가용성 강화:** PostgreSQL Single-AZ에서 Multi-AZ로 확장한다.
4. **중앙 로그 관리:** Loki/Promtail을 도입하여 Kubernetes 애플리케이션 로그를 통합 조회한다.
5. **모니터링 확장:** Prometheus, Grafana, Alertmanager를 연동하여 장애 알림을 지원한다.
6. **S3 첨부파일 저장:** 프로젝트 파일을 S3에 저장하고 Backend 권한 검사를 통해 관리한다.
7. **Kubernetes API 연동:** Pod 및 Deployment 상태를 애플리케이션에서 조회할 수 있도록 한다.
8. **운영 기능 확장:** 배포 이력, 파이프라인 이력, 수동 배포 및 롤백 기능을 추가한다.
9. **사용자 기능 확장:** 세부 권한, 댓글, 파일 첨부, 마감일, 우선순위 및 멤버 초대 기능을 추가한다.

### 최종 서비스 흐름

```text
사용자
  │
  ▼
Route 53
  │
  ▼
CloudFront
  ├───────────────┐
  │               │
  ▼               ▼
S3 Frontend     ALB
                  │
                  ▼
               EKS
                  │
                  ▼
             Backend Pods
                  │
            ┌─────┴─────┐
            │           │
            ▼           ▼
       RDS Multi-AZ   S3 Attachment
```

### 최종 배포 흐름

```text
Developer
    │
    ▼
GitLab
    │
    ▼
GitLab Runner
    │
    ├── Frontend Build → S3 → CloudFront
    │
    └── Backend Build
             │
             ▼
     Container Registry
             │
             ▼
      GitOps Repository
             │
             ▼
          Argo CD
             │
             ▼
          EKS Sync
             │
             ▼
        Backend Pods
```

**최종 목표:** 기존 2차 MVP를 기반으로 DevFlow를 GitOps 중심의 자동 배포, 클라우드 네이티브 운영, 중앙 모니터링 및 고가용성 기능을 갖춘 3차 확장 플랫폼으로 발전시킨다.

본 문서는 3차 목표 아키텍처를 정의하며, 각 리소스의 실제 배포 완료 여부는 해당 Phase의 구현 및 검증 결과에 따라 별도로 판단한다.