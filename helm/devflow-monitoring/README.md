# devflow-monitoring — Phase 3.4 Observability Helm Charts

EKS `monitoring` Namespace에 배포하는 Loki / Grafana Alloy / Alertmanager 3개의
독립 Helm Chart입니다. 기존 Prometheus·Grafana(`k8s/monitoring/monitoring.yaml`)는
Argo CD 관리와 동일하게 이 charts의 관리 대상이 아니며, 3개 release도 Argo CD에
등록하지 않고 운영자가 VPC 도달 환경(VPN/bastion)에서 수동으로 적용합니다.

## Charts

| Release | Chart | Upstream | 배포 내용 |
|---|---|---|---|
| `devflow-loki` | `loki/` | grafana-community `loki` chart 20.2.1 (Loki 3.7.9) | Loki Monolithic 단일 StatefulSet + PVC 20Gi |
| `devflow-alloy` | `alloy/` | Grafana Alloy v1.21.2 (자체 thin chart) | DaemonSet, Kubernetes API 기반 Pod 로그 수집 |
| `devflow-alertmanager` | `alertmanager/` | Alertmanager v0.34.2 (자체 thin chart) | Slack + DevFlow Incident Webhook 동시 전송 |

Loki는 dependency 기반 wrapper chart이므로 `Chart.lock`과 함께
`helm dependency build`로 upstream tarball를 받아 렌더합니다.

## 값 주입점

- `loki/values.yaml` → `loki.singleBinary.persistence.storageClass`
  (기본값 `ebs-sc`는 예시 placeholder입니다. 배포 전 Runbook의 StorageClass/EBS CSI
  사전 점검에서 실측한 실제 StorageClass 이름으로 교체해야 합니다. 해당 점검 실패 시
  Loki 배포를 중단합니다.)
- `loki/values.yaml` → `loki.loki.*` 는 Loki 프로세스 런타임 설정입니다
  (`loki:` 키가 dependency alias와 Loki config 섹션 두 계층으로 중첩됩니다).
- `alertmanager/values.yaml` → Secret 이름 참조만 담고 있습니다. Secret 값 자체는
  Git에 저장하지 않고 Runbook의 kubectl 명령으로 생성합니다.

## 로컬 검증 (live 변경 없음)

```bash
helm dependency build helm/devflow-monitoring/loki
helm lint helm/devflow-monitoring/loki helm/devflow-monitoring/alloy helm/devflow-monitoring/alertmanager
helm template devflow-loki helm/devflow-monitoring/loki -n monitoring
helm template devflow-alloy helm/devflow-monitoring/alloy -n monitoring
helm template devflow-alertmanager helm/devflow-monitoring/alertmanager -n monitoring
```

Alertmanager 설정 유효성(amtool)과 Alloy 문법 검증(alloy fmt)은 로컬에
도구가 없을 경우 Runbook의 docker/binary 명령으로 수행합니다.

## 배포·롤백

전체 절차는 `docs/migration/phase-3.4-observability-runbook.md`를 따릅니다.
배포 순서는 Loki → Alloy → Alertmanager입니다.
