# 온프레미스 모니터링

## 버전 및 관리 범위

- Helm repository: https://prometheus-community.github.io/helm-charts
- Chart: prometheus-community/prometheus 29.37.0
- Prometheus: v3.15.0
- Release: onprem-monitoring
- Namespace: monitoring
- 최초 설치: 2026-10-19

파일:
- storage.yaml: Namespace, 로컬 PV 및 PVC
- values.yaml: 실제 적용한 Helm 사용자 설정

이 디렉터리는 devflow-onprem Application의 동기화 대상이 아니다.
운영자가 kubectl과 Helm으로 별도 관리한다.

## 사전 조건

- Kubernetes 노드 3개가 Ready 상태여야 한다.
- 기존 StorageClass onprem-local이 있어야 한다.
- onprem-worker-02에 로컬 데이터 디렉터리가 필요하다.
- Backend Pod는 namespace=devflow, app=backend 라벨과 이름이 http인 포트를 사용한다.
- Backend /actuator/prometheus에 클러스터 내부에서 접근할 수 있어야 한다.

worker02 SSH에서 데이터 디렉터리를 준비한다.

```bash
sudo install -d -o 65534 -g 65534 -m 0750 \
  /srv/devflow/prometheus
```

## 저장소

- PV: onprem-prometheus-pv
- PVC: monitoring/prometheus-data
- 용량: 3Gi
- StorageClass: onprem-local
- 노드: onprem-worker-02
- 경로: /srv/devflow/prometheus
- 회수 정책: Retain

PV는 특정 노드의 로컬 디렉터리를 사용한다.
노드 장애 시 다른 노드로 데이터를 자동 이전하지 않는다.
3Gi 선언은 디렉터리의 파일시스템 사용량을 강제 제한하는 쿼터가 아니다.
PVC 삭제 후 재사용은 PV 상태와 기존 데이터를 확인하여 별도로 처리한다.

## 렌더링 및 설치

아래 명령은 저장소 루트에서 CP SSH로 실행한다.

```bash
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts

helm repo update

helm template onprem-monitoring prometheus-community/prometheus \
  --version 29.37.0 \
  --namespace monitoring \
  -f k8s/bootstrap/onprem/monitoring/values.yaml \
  > /tmp/onprem-monitoring-rendered.yaml

kubectl apply -f k8s/bootstrap/onprem/monitoring/storage.yaml

helm upgrade --install onprem-monitoring \
  prometheus-community/prometheus \
  --version 29.37.0 \
  --namespace monitoring \
  -f k8s/bootstrap/onprem/monitoring/values.yaml \
  --wait \
  --timeout 10m
```

## 수집 구성

| job | 대상 | 예상 대상 수 |
|---|---|---|
| prometheus | Prometheus 자체 | 1 |
| kube-state-metrics | Deployment·Pod·노드·HPA·CronJob 상태 | 1 |
| node-exporter | 노드 CPU·메모리 | 3 |
| backend | Backend /actuator/prometheus | 정상 앱 Pod 수 |

Backend가 1개인 검증 시점에는 총 6개 대상이 up이었다.
배포 중 Pod 교체 등에 따라 대상 수는 일시적으로 달라질 수 있다.

- node-exporter 지표의 node 라벨은 Kubernetes 노드 이름과 일치한다.
- Backend 지표에는 namespace, pod, node 라벨을 붙인다.
- 수집 주기는 60초이며 화면에 상태가 반영되기까지 시차가 있을 수 있다.
- kube-state-metrics는 필요한 리소스 종류만 수집한다.
- Alertmanager와 Pushgateway는 비활성화했다.
- Grafana, 로그 수집, PostgreSQL exporter는 이번 구성에 포함하지 않는다.
- HPA 리소스는 현재 생성하지 않았다.

## 보관 및 자원

- 보관 기간 설정: 2d
- 보관 크기 설정: 2GB
- Prometheus는 worker02, kube-state-metrics는 worker01에 배치한다.
- node-exporter는 노드별 DaemonSet으로 실행한다.
- 메모리 requests는 예약 기준이며 실사용량의 상한이 아니다.

기간과 크기 제한 중 먼저 도달한 조건에 따라 데이터가 삭제될 수 있다.
2GB 설정은 WAL 등 전체 데이터 디렉터리의 사용량을 제한하지 않는다.
노드 디스크 여유 공간과 실제 보관 기간은 별도로 확인한다.

## DevFlow 환경 등록

- Prometheus URL: http://onprem-prometheus.monitoring.svc.cluster.local:9090
- namespace: devflow
- appDeployment: backend
- metricsJob: backend
- nodeLabel: node
- Prometheus 인증 토큰: 현재 미사용

Prometheus는 ClusterIP로만 제공하며 Ingress는 비활성화했다.
위 DNS 주소는 클러스터 내부 앱에서 사용한다.
Windows 브라우저가 이 주소로 직접 접속하는 구성은 아니다.
AWS의 DevFlow에서 접근하려면 별도 네트워크 경로가 필요하다.

## 검증

```bash
helm list -n monitoring

kubectl get pods,svc,pvc -n monitoring -o wide

kubectl get pv onprem-prometheus-pv

kubectl rollout status deployment/onprem-prometheus \
  -n monitoring --timeout=180s

kubectl top pods -n monitoring
```

추가로 Prometheus /api/v1/targets에서 각 대상의 health와 lastError를 확인한다.
DevFlow 테스트 프로젝트에서 환경 연결, 앱 모니터링과 노드 실데이터 표시를 확인했다.

DB 지표·백업 기록·Traefik 전용 지표·Alertmanager 알림은 별도 후속 검증 대상이다.
비밀번호, 토큰, kubeconfig 및 실제 데이터 파일은 Git에 포함하지 않는다.
