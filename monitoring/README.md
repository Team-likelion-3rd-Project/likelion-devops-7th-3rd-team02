# DevFlow Monitoring

DevFlow 애플리케이션과 Kubernetes 환경의 상태를 모니터링하기 위해 Prometheus와 Grafana를 구성합니다.

2차 프로젝트에서는 Helm을 사용하지 않고 Kubernetes Manifest 기반으로 Prometheus와 Grafana를 구성합니다.  
Application 및 Monitoring 관련 Kubernetes Manifest는 Infra 담당자가 작성 및 테스트 중이며, Manifest가 저장소에 공유된 이후 실제 EKS 환경에서 모니터링 구성 및 검증을 진행합니다.

---

## 구성 요소

DevFlow Monitoring은 다음 구성요소를 사용합니다.

- Prometheus
- Grafana
- kube-state-metrics
- node-exporter
- Spring Boot Actuator
- Micrometer Prometheus Registry

Backend에는 Spring Boot Actuator와 Micrometer Prometheus Registry가 적용되어 있으며 Prometheus가 애플리케이션 메트릭을 수집할 수 있도록 구성되어 있습니다.

---

## Backend Metrics Endpoint

Backend Application은 다음 Endpoint를 통해 Prometheus Metrics를 제공합니다.

```text
/actuator/prometheus
```

Backend의 Spring Security 설정에서는 다음 Endpoint에 인증 없이 접근할 수 있도록 설정되어 있습니다.

```text
/actuator/health/**
/actuator/prometheus
```

따라서 Backend가 Kubernetes 환경에 정상적으로 배포된 이후 Prometheus가 `/actuator/prometheus` Endpoint를 통해 애플리케이션 메트릭을 수집할 수 있습니다.

---

## 모니터링 구조

전체적인 Application Monitoring 흐름은 다음과 같습니다.

```text
Backend Application
        │
        │ /actuator/prometheus
        ▼
    Prometheus
        │
        ▼
      Grafana
        │
        ▼
DevFlow Dashboard
```

Kubernetes 환경에서는 애플리케이션 메트릭뿐만 아니라 Kubernetes 리소스 및 Node 상태도 함께 수집합니다.

```text
EKS
 │
 ├── Application Metrics
 │     └── Spring Boot Actuator
 │
 ├── Kubernetes Resource Metrics
 │     └── kube-state-metrics
 │
 └── Node Metrics
       └── node-exporter
```

---

## 주요 모니터링 항목

### Application Metrics

- HTTP Request Rate
- HTTP Error Rate
- HTTP Response Time
- JVM Memory Usage
- Process CPU Usage
- HikariCP Connection Pool

### Kubernetes Metrics

- Pod CPU Usage
- Pod Memory Usage
- Pod Restart Count
- Deployment Replica Count
- Pod Status
- Node Resource Usage

---

## Prometheus 검증

Monitoring Kubernetes Manifest가 저장소에 반영된 이후 EKS 환경에 Manifest를 적용합니다.

먼저 Monitoring Namespace의 Pod와 Service 상태를 확인합니다.

```bash
kubectl get pods -n monitoring
kubectl get services -n monitoring
```

Prometheus Pod가 정상적으로 실행되는지 확인한 후 Prometheus Target에서 Backend Application이 정상적으로 수집되고 있는지 확인합니다.

Backend Metrics Endpoint:

```text
/actuator/prometheus
```

주요 확인 사항은 다음과 같습니다.

- Prometheus Pod 정상 실행
- Backend Target 상태 `UP`
- `/actuator/prometheus` 접근 가능
- Spring Boot Application Metrics 수집
- Kubernetes Metrics 수집
- Node Metrics 수집

---

## Grafana 검증

Grafana Pod가 정상적으로 실행되는지 확인합니다.

```bash
kubectl get pods -n monitoring
```

Grafana 접속 후 Prometheus가 Data Source로 정상 연결되어 있는지 확인합니다.

Grafana Dashboard에서는 다음 항목을 우선적으로 구성합니다.

- Backend Status
- Backend CPU Usage
- Backend JVM Heap Memory Usage
- Backend Replicas
- Backend HPA Desired Replicas
- EKS Node CPU Usage
- EKS Node Memory Usage
- Application Pod Status

Dashboard 구성이 완료되면 Grafana에서 Dashboard JSON을 Export하여 저장소에 보관합니다.

```text
monitoring/grafana/dashboards/devflow-eks-monitoring.json
```

---

## CI/CD 연계

GitLab CI/CD에서는 Kubernetes 배포 이후 애플리케이션 상태를 검증할 수 있도록 다음 작업을 구성합니다.

```text
Build
  ↓
Test
  ↓
Docker Image Build
  ↓
GitLab Container Registry Push
  ↓
AWS / EKS Verify
  ↓
Kubernetes Deploy
  ↓
Rollout Check
  ↓
Health Check
```

현재 다음 스크립트가 준비되어 있습니다.

```text
scripts/
├── deploy.sh
├── health-check.sh
└── rollback.sh
```

각 스크립트의 역할은 다음과 같습니다.

### deploy.sh

- EKS kubeconfig 설정
- Kubernetes Manifest 적용
- Frontend / Backend 이미지 업데이트
- Commit SHA 기반 Docker Image 배포
- Frontend / Backend Rollout 상태 확인

### health-check.sh

- Deployment 상태 확인
- Pod 상태 확인
- Service 상태 확인
- Frontend / Backend Rollout 확인
- Backend Readiness Endpoint 확인
- Backend Liveness Endpoint 확인

### rollback.sh

- Deployment Rollout History 확인
- Frontend / Backend 이전 Revision 복구
- Rollback 상태 확인
- Rollback 이후 Image 및 Pod 상태 확인

---

## 현재 진행 상태

현재 CI/CD 및 Monitoring 환경의 실제 EKS 검증까지 완료되었습니다.

### CI/CD

- GitLab Runner 구성
- Docker Executor 구성
- Frontend / Backend Build 검증
- Backend Unit Test 검증
- Docker Image Build 및 GitLab Container Registry Push
- Commit SHA 기반 Docker Image Tag 적용
- GitLab Runner에서 AWS / EKS 접근 검증
- Kubernetes Deploy Job 구성 및 실제 배포 검증
- Frontend / Backend Rolling Update 검증
- Health Check Job 구성 및 실제 검증
- Rollback 구성 및 검증

### Kubernetes

- Frontend / Backend Deployment 정상 동작 확인
- Frontend / Backend Service 정상 동작 확인
- Backend HPA 구성 및 실제 Scale-out / Scale-in 검증
- Backend Pod Self-Healing 검증
- Metrics Server를 통한 CPU / Memory Metrics 수집 확인

HPA 설정:

```text
Min Replicas : 2
Max Replicas : 4
CPU Target   : 70%
```

실제 부하 테스트 결과:

```text
Scale-out
2 → 3 → 4

Scale-in
4 → 3 → 2
```

실제 서비스 API인 다음 Path를 대상으로 JWT 인증 요청을 반복하여 HPA 동작을 추가 검증했습니다.

```http
GET /api/projects
```

테스트 중 Backend CPU 사용률이 HPA Target을 초과하여 최대 103%까지 상승했으며 Backend Replica가 최대 4개까지 증가한 후 부하 종료 시 다시 2개로 감소하는 것을 확인했습니다.

상세 테스트 결과:

```text
docs/kubernetes-test.md
```

---

## Prometheus 검증 결과

Prometheus가 다음 Target의 Metrics를 정상적으로 수집하는 것을 확인했습니다.

```text
Prometheus           UP
Backend Pod 1        UP
Backend Pod 2        UP
node-exporter 1      UP
node-exporter 2      UP
kube-state-metrics   UP
```

Backend Metrics는 다음 Endpoint를 통해 수집합니다.

```text
/actuator/prometheus
```

Prometheus에서 다음 Metrics가 정상적으로 수집되는 것을 확인했습니다.

- Backend Process CPU
- Backend JVM Memory
- Kubernetes Deployment Replica
- HPA Desired Replica
- Pod Status
- Node CPU
- Node Memory

---

## Grafana 검증 결과

Grafana와 Prometheus Data Source 연결을 완료하고 다음 메시지를 통해 정상 연결을 확인했습니다.

```text
Successfully queried the Prometheus API.
```

Grafana에서 Prometheus의 `up` Metric을 조회하여 Backend, node-exporter, kube-state-metrics 및 Prometheus Target이 모두 정상 상태임을 확인했습니다.

현재 DevFlow Dashboard는 다음 8개의 패널로 구성되어 있습니다.

| Panel | 설명 |
|---|---|
| Backend Status | Backend Prometheus Target 상태 |
| Backend CPU Usage | Backend Pod별 CPU 사용률 |
| Backend JVM Heap Memory Usage | Backend Pod별 JVM Heap Memory |
| Backend Replicas | Backend Deployment Replica 변화 |
| Backend HPA Desired Replicas | HPA가 요청하는 Replica 변화 |
| EKS Node CPU Usage | Worker Node CPU 사용률 |
| EKS Node Memory Usage | Worker Node Memory 사용률 |
| Application Pod Status | Frontend / Backend Pod Ready 상태 |

Grafana Dashboard JSON은 다음 경로에서 관리합니다.

```text
monitoring/grafana/dashboards/devflow-eks-monitoring.json
```

Dashboard를 Git Repository에서 관리하여 Grafana 환경이 재생성되더라도 동일한 Monitoring Dashboard를 재구성할 수 있도록 합니다.

---

## Monitoring Architecture

현재 Monitoring 흐름은 다음과 같습니다.

```text
DevFlow Backend
     │
     │ /actuator/prometheus
     ▼
Prometheus
     │
     ├── Backend Metrics
     ├── kube-state-metrics
     └── node-exporter
     │
     ▼
Grafana
     │
     ▼
DevFlow EKS Monitoring Dashboard
```

HPA 테스트 시에는 다음 흐름을 Grafana와 Kubernetes에서 함께 확인할 수 있습니다.

```text
GET /api/projects 반복 요청
        ↓
Backend CPU 증가
        ↓
HPA CPU Target 70% 초과
        ↓
Desired Replica 증가
        ↓
Backend Replica
2 → 3 → 4
        ↓
부하 종료
        ↓
CPU 감소
        ↓
Backend Replica
4 → 3 → 2
```

---

## Grafana 접근

Grafana Service는 Kubernetes `ClusterIP`로 구성되어 있어 외부에 직접 노출하지 않습니다.

필요한 경우 AWS Systems Manager Port Forwarding과 Kubernetes Port Forwarding을 이용하여 접근합니다.

```text
Local Browser
      ↓
AWS SSM Port Forwarding
      ↓
Management EC2
      ↓
kubectl port-forward
      ↓
Grafana Service
```

이는 Monitoring UI를 Public Internet에 직접 노출하지 않고 필요한 경우에만 관리 경로를 통해 접근하기 위한 구성입니다.

---

## Dashboard 관리

Grafana UI에서 수정한 Dashboard는 변경 후 JSON으로 Export하여 Repository에 반영합니다.

```text
monitoring/
├── README.md
└── grafana/
    └── dashboards/
        └── devflow-eks-monitoring.json
```

JSON 유효성은 다음 명령으로 확인할 수 있습니다.

```bash
python3 -m json.tool \
  monitoring/grafana/dashboards/devflow-eks-monitoring.json \
  >/dev/null && echo "JSON OK"
```

---

## 향후 개선 사항

현재 프로젝트에서는 Prometheus와 Grafana를 Kubernetes Manifest 기반으로 구성하고 Dashboard JSON을 Git에서 관리합니다.

향후 다음 항목을 개선할 수 있습니다.

1. Grafana Dashboard ConfigMap / Provider 기반 자동 Provisioning
2. Grafana Persistent Volume 적용
3. Alertmanager 기반 장애 알림
4. Slack / Discord Monitoring Alert 연계
5. Backend HTTP Request Rate / Error Rate / Response Time Dashboard 고도화
6. Prometheus 장기 Metrics Storage 구성
7. Monitoring Manifest의 Helm 또는 GitOps 기반 관리
