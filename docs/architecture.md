# DevFlow 2차 프로젝트 - AWS 및 Kubernetes 설계

## 1. 최종 결정 요약

| 항목        | 결정                                   |
| ----------- | -------------------------------------- |
| Kubernetes  | Amazon EKS                             |
| Region / AZ | 1개 Region, 2개 AZ                     |
| VPC         | `10.0.0.0/16`                          |
| Frontend    | EKS Deployment, Replica 2              |
| Backend     | EKS Deployment, Replica 2              |
| Registry    | GitLab Container Registry              |
| GitLab      | GitLab + Runner + Registry 단일 EC2    |
| RDS         | PostgreSQL Single-AZ, Private Access   |
| 외부 진입점 | DevFlow용 ALB 1개                      |
| CI/CD       | GitLab Runner가 Kubernetes에 직접 배포 |
| HPA         | Backend, CPU 60%, min 2, max 6         |

## 2. EKS 선택 근거

- 담당 범위가 AWS VPC, Subnet, Security Group, ALB, RDS, IAM, Kubernetes 운영을 포함한다.
- AWS 연동과 3차 확장성을 포트폴리오에 보여주기 좋다.
- k3s는 MVP 기능 검증에는 충분하지만 단일 EC2 구성 시 Node/AZ 장애 대응을 보여주기 어렵다.
- EKS 비용과 복잡도를 통제하기 위해 2차에서는 Argo CD, Helm 앱 배포, CloudFront/S3 Frontend, RDS Multi-AZ, Loki를 제외한다.

## 3. AWS 아키텍처

```text
AWS Region
├─ Route 53
│  ├─ devflow.example.com → DevFlow ALB
│  └─ gitlab.example.com → GitLab EC2
├─ VPC 10.0.0.0/16
│  ├─ AZ-A
│  │  ├─ Public Subnet A: ALB, NAT Gateway, GitLab EC2
│  │  ├─ Private App Subnet A: EKS Worker Node
│  │  └─ Private DB Subnet A: RDS 배치 후보
│  └─ AZ-B
│     ├─ Public Subnet B: ALB
│     ├─ Private App Subnet B: EKS Worker Node
│     └─ Private DB Subnet B: DB Subnet Group
├─ EKS Cluster
│  ├─ Frontend Pods x2
│  ├─ Backend Pods x2 + HPA
│  └─ Prometheus / Grafana / Metrics Server
└─ RDS PostgreSQL Single-AZ
```

## 4. VPC 및 Subnet

| 영역        | AZ-A           | AZ-B           |
| ----------- | -------------- | -------------- |
| Public      | `10.0.1.0/24`  | `10.0.2.0/24`  |
| Private App | `10.0.10.0/24` | `10.0.11.0/24` |
| Private DB  | `10.0.20.0/24` | `10.0.21.0/24` |

2차 비용 절감을 위해 NAT Gateway는 1개를 사용하며, 완전한 AZ 고가용성이 아니라는 점을 명시한다.

## 5. Security Group

- ALB SG: 80/443 from Internet
- GitLab SG: 443 from Internet, SSM 사용
- EKS Node SG: ALB SG에서 오는 서비스 트래픽
- RDS SG: EKS Node SG에서 오는 5432만 허용

## 6. RDS PostgreSQL

- Single-AZ
- DB Subnet Group은 Private DB Subnet A/B 포함
- Public Access 비활성화
- Storage Encryption 및 자동 백업 활성화
- ConfigMap: `DB_HOST`, `DB_PORT`, `DB_NAME`
- Secret: `DB_USERNAME`, `DB_PASSWORD`

## 7. Namespace

- `devflow`: 애플리케이션 리소스
- `monitoring`: Prometheus, Grafana, kube-state-metrics, node-exporter
- `kube-system`: Metrics Server, AWS Load Balancer Controller

## 8. Frontend / Backend

| 항목          | Frontend                     | Backend                      |
| ------------- | ---------------------------- | ---------------------------- |
| Replica       | 2                            | 2                            |
| Service       | ClusterIP 80                 | ClusterIP 8080               |
| RollingUpdate | maxUnavailable 0, maxSurge 1 | maxUnavailable 0, maxSurge 1 |
| HPA           | 미적용                       | CPU 60%, min 2, max 6        |

## 9. Ingress

- `/` → `frontend-service`
- `/api/*` → `backend-service`
- `/actuator/health*` → `backend-service`
- `/actuator/prometheus`는 외부 Ingress로 공개하지 않고 Prometheus가 내부에서 수집한다.

## 10. ConfigMap / Secret

### ConfigMap

- `SPRING_PROFILES_ACTIVE`
- `DB_HOST`, `DB_PORT`, `DB_NAME`
- `SERVER_PORT`
- `JWT_EXPIRATION`
- `CORS_ALLOWED_ORIGINS`
- `APP_VERSION`
- `MANAGEMENT_ENDPOINTS`

### Secret

- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- GitLab Registry `imagePullSecret`

## 11. Probe

- Frontend Liveness / Readiness: `GET /`
- Backend Startup / Liveness: `/actuator/health/liveness`
- Backend Readiness: `/actuator/health/readiness`
- DB 장애는 Liveness가 아니라 Readiness에서 판단한다.

## 12. Resource 및 HPA

| Workload | CPU Request | CPU Limit | Memory Request | Memory Limit |
| -------- | ----------: | --------: | -------------: | -----------: |
| Frontend |         50m |      200m |           64Mi |        128Mi |
| Backend  |        250m |     1000m |          512Mi |          1Gi |

Backend HPA: `minReplicas: 2`, `maxReplicas: 6`, CPU `averageUtilization: 60`.

## 13. ServiceAccount / RBAC

- `frontend-sa`: Kubernetes API 권한 없음
- `backend-sa`: Kubernetes API 권한 없음
- `gitlab-deployer`: `devflow` Namespace 배포에 필요한 최소 권한
- `cluster-admin` 사용 금지
- Secret 초기 생성 절차는 일반 배포 Job과 분리

## 14. Pod 장애 복구 테스트

1. Backend Pod 2개와 Node 배치를 기록한다.
2. Pod 1개를 삭제한다.
3. 새 Pod 생성과 Ready 전환을 관찰한다.
4. Replica가 2개로 복구되는지 확인한다.
5. 테스트 중 Health Check와 API가 유지되는지 확인한다.
6. 삭제/생성/Ready 시각과 서비스 영향 여부를 기록한다.

## 15. Terraform 모듈

```text
terraform/
├─ modules/
│  ├─ network/
│  ├─ security/
│  ├─ gitlab/
│  ├─ eks/
│  ├─ rds/
│  └─ monitoring/
└─ environments/
   └─ dev/
```

Terraform은 AWS 인프라를 관리하고, Kubernetes 애플리케이션 배포는 YAML과 GitLab CI/CD가 담당한다.
