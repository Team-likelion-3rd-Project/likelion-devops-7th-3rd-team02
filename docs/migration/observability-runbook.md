#Observability Runbook — Loki / Alloy / Alertmanager (EKS dev)

범위:Loki, Grafana Alloy, Alertmanager의
EKS `devflow-dev-eks` `monitoring` Namespace 배포·검증·롤백.
Prometheus/Grafana 기존 구성과 GitOps/Argo CD 구조는 변경하지 않는다.
모든 helm install/upgrade/uninstall, kubectl mutation, Secret 생성은
**운영 승인 후**에만 수행한다. 이 문서 자체가 실행 기록이 아니며,
수행하지 않은 단계는 보고서의 NOT RUN 항목과 대응한다.

## 0. 사전 확인 (read-only)

```bash
aws sts get-caller-identity
kubectl config current-context
kubectl -n monitoring get pods
kubectl -n devflow get deploy backend
```

- EKS API endpoint는 private 전용이다. 모든 helm/kubectl 명령은 VPC에서
  도달 가능한 환경(VPN / bastion)에서 실행한다.
  `aws eks update-kubeconfig --region ap-northeast-1 --name devflow-dev-eks`
- 대상 namespace는 `monitoring`, Loki Service는 렌더 결과상 `loki`
  (`http://loki.monitoring.svc.cluster.local:3100`)이다.

## 1. StorageClass / EBS CSI 사전 점검 (배포 필수 게이트)

Terraform EKS addon은 vpc-cni/coredns/kube-proxy뿐이며 aws-ebs-csi-driver는
이번 Phase에서 추가하지 않는다. 따라서 cluster의 실제 StorageClass를实测로 확인한다.

```bash
kubectl get storageclass
kubectl get csidriver
kubectl -n kube-system get pods | Select-String ebs-csi
```

- PASS 조건: PVC provisioning이 가능한 StorageClass가 실재하고, 그 이름이 확인되는지.
  확인된 이름을 `helm/devflow-monitoring/loki/values.yaml`의
  `loki.singleBinary.persistence.storageClass`(placeholder `ebs-sc`)에 반영한다.
- StorageClass가 없거나 CSI driver가 없어 동적 provisioning이 불가하면
  **Loki 배포를 중단하고 BLOCKED 보고**한다. EBS CSI addon이나 Terraform 자원을
  임의 생성하지 않는다. (로컬 Build의 PVC 렌더 검증과 무관한 live 게이트다.)

## 2. Loki 배포 (승인 필요)

```bash
helm dependency build helm/devflow-monitoring/loki
helm -n monitoring upgrade --install devflow-loki helm/devflow-monitoring/loki --wait --timeout 10m
```

검증:

```bash
kubectl -n monitoring get pvc -l app.kubernetes.io/name=loki      # Bound
kubectl -n monitoring get sts loki                                # 1/1
kubectl -n monitoring get svc loki                                # ClusterIP :3100
kubectl -n monitoring exec loki-0 -- sh -c "ls /var/loki"         # chunks/tsdb-index/compactor 디렉터리
kubectl -n monitoring port-forward svc/loki 3100:3100
curl.exe http://localhost:3100/ready                              # ready
curl.exe http://localhost:3100/config                             # retention 설정 대조:
#   limits_config.retention_period: 168h
#   compactor.retention_enabled: true / delete_request_store: filesystem
#   compactor.working_directory: /var/loki/compactor (PVC 마운트 내부)
#   schema_config ... index.period: 24h / object_store: filesystem / replication_factor: 1
```

## 3. Alertmanager Secret 준비 (승인 필요, 값은 Git에 남기지 않음)

```bash
kubectl -n monitoring create secret generic devflow-alertmanager-slack `
  --from-literal=webhook-url='<Slack Incoming Webhook URL — 사용자 입력>'
kubectl -n monitoring create secret generic devflow-alertmanager-webhook `
  --from-literal=alertmanager-token='<DevFlow 화면(클라우드 연결→Webhook 토큰)에서 발급한 WT2 alertmanager 토큰>'
```

- WT2 토큰은 원문 발급 화면에서 한 번만 표시된다. 재발급 시 `monitoring`의
  사본과 온프레미스 `monitoring` 사본을 함께 갱신한다(온프레미스 ALERTMANAGER.md 정책).
- Alertmanager는 위 Secret이 없으면 Pod가 기동하지 않는다. 먼저 생성한다.

## 4. Alertmanager 배포 (승인 필요)

배포 전 설정 유효성 (amtool 또는 docker):

```bash
amtool check-config helm/devflow-monitoring/alertmanager/alertmanager.yml
# amtool이 없으면:
docker run --rm --entrypoint=/bin/amtool -v <repo>/helm/devflow-monitoring/alertmanager:/c:ro quay.io/prometheus/alertmanager:v0.34.2 check-config /c/alertmanager.yml
```

```bash
helm -n monitoring upgrade --install devflow-alertmanager helm/devflow-monitoring/alertmanager --wait --timeout 5m
```

검증:

```bash
kubectl -n monitoring get deploy alertmanager                     # 1/1
kubectl -n monitoring port-forward svc/alertmanager 9093:9093
curl.exe http://localhost:9093/-/ready
curl.exe http://localhost:9093/api/v2/status | Select-String cluster   # cluster: disabled 기대 (--cluster.listen-address=)
```

## 5. Alloy 배포 (승인 필요)

```bash
helm -n monitoring upgrade --install devflow-alloy helm/devflow-monitoring/alloy --wait --timeout 5m
```

검증:

```bash
kubectl -n monitoring get ds alloy                    # desired = node group 노드 수
kubectl -n monitoring get pods -l app=alloy -o wide   # 노드당 1개
# RBAC 실측:
kubectl auth can-i get pods/log --as=system:serviceaccount:monitoring:alloy           # yes
kubectl auth can-i list pods --as=system:serviceaccount:monitoring:alloy              # yes
kubectl auth can-i get namespaces --as=system:serviceaccount:monitoring:alloy         # yes
kubectl auth can-i list secrets --as=system:serviceaccount:monitoring:alloy           # no (확대 금지 확인)
```

River config 문법 검증(로컬 도구 확인용):

```bash
helm -n monitoring template devflow-alloy helm/devflow-monitoring/alloy | Select-String -Pattern 'config.alloy' -Context 0,60
alloy fmt config.alloy   # 또는 docker run --rm -v <dir>:/c grafana/alloy:v1.21.2 fmt /c/config.alloy
```

## 6. 로그 수집 E2E 검증

```bash
kubectl -n monitoring port-forward svc/loki 3100:3100
# Backend 로그 조회 (LogQL):
curl.exe -G "http://localhost:3100/loki/api/v1/query_range" --data-urlencode 'query={namespace="devflow"} |= "Started"' --data-urlencode "start=$(Get-Date).ToUniversalTime().AddMinutes(-15).ToString('yyyy-MM-ddTHH:mm:ssZ')" --data-urlencode end=$(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
```

- Grafana Explore(port-forward svc/grafana 3000:3000) → Loki datasource(uid `loki`)에서
  `{namespace="devflow"}` 조회.
- **중복 수집 검증**: 같은 `pod`라벨의 로그 라인 수가 노드 수만큼 반복되지 않는지,
  `{namespace="devflow"} | line_format "{{.node}}"`에서 로그의 node 라벨이
  해당 Pod 실제 배치 노드와 일치하는지 확인.
- Backend 로그가 없으면 `/actuator/health` polled 로그나 임시 Pod로 생성:
  `kubectl -n devflow run logtest --image=busybox --restart=Never -- sh -c 'for i in 1 2 3; do echo phase34-logtest; sleep 5; done'`

## 7. Grafana Datasource 반영

`k8s/monitoring/monitoring.yaml`의 `grafana-datasource` ConfigMap에 Loki 항목이
추가되어 있다(uid `loki`). 반영은 수동:

```bash
kubectl apply -f k8s/monitoring/monitoring.yaml -l 'app.kubernetes.io/name in (grafana)' --dry-run=server   # 사전 diff
# 위 dry-run이 datasource 변경만 표시하는지 확인 후:
kubectl apply -f k8s/monitoring/monitoring.yaml     # 승인 필요 — 전체 manifest 재apply, 무충돌 확인 후
kubectl -n monitoring rollout restart deploy/grafana
kubectl -n monitoring rollout status deploy/grafana
```

Prometheus datasource(uid `prometheus`, isDefault)와 기존 대시보드는 불변이어야 한다.

## 8. 테스트 알림 주입 (Prometheus 미연결 제약)

현재 EKS Prometheus의 `prometheus.yml`에는 `alerting:` 섹션이 없고 본 Phase에서
변경하지 않는다. Prometheus 기점 경보 전달은 이번 범위 밖이므로, Alertmanager API에
직접 주입해 Slack→DevFlow Incident→resolved 경로를 검증한다.

```bash
# 8-1. amtool 주입 (end 시각 5분 후 → 도달 시 resolved 전송)
$startRfc3339 = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$endRfc3339 = (Get-Date).ToUniversalTime().AddMinutes(5).ToString('yyyy-MM-ddTHH:mm:ssZ')
amtool alert add DevFlowPhase34Test alertname=DevFlowPhase34Test severity=warning devflow_env=dev --alertmanager.url=http://localhost:9093 --start=$startRfc3339 --end=$endRfc3339
# 8-2. 또는 API 주입 (v2 본문은 JSON 최상위 배열):
$alert = @{
    labels      = @{ alertname = 'DevFlowPhase34Test'; severity = 'warning'; devflow_env = 'dev' }
    annotations = @{ description = 'phase 3.4 test' }
    startsAt    = $startRfc3339
    endsAt      = $endRfc3339
}
$body = '[' + ($alert | ConvertTo-Json -Depth 5 -Compress) + ']'
Invoke-RestMethod -Method Post -Uri http://localhost:9093/api/v2/alerts -ContentType 'application/json' -Body $body
```

확인 항목:

1. Slack `#devflow-alerts` 채널에 알림 도달 (firing, 이후 resolved).
2. Backend 로그: `kubectl -n devflow logs deploy/backend | Select-String alertmanager`
   → `alertmanager webhook: created=1` (firing 시), 갱신은 `updated=1`.
3. DevFlow 화면 → 프로젝트 → 장애(Incident) 목록에 OPEN 장애 생성, fingerprint 기준
   중복 없음(재전송 시 갱신만).
4. resolved 전송 후: 장애 `firing=false`, ACKNOWLEDGED 확인 후 `incident.auto-resolve-after`
   (기본 30분) 뒤 자동 RESOLVED, 또는 화면 해결 버튼으로 종료.
5. Alertmanager 수신 이력: `curl.exe http://localhost:9093/api/v2/alerts`.

Slack Webhook URL이 준비되지 않았다면 Slack 경로는 NOT RUN으로 두고, DevFlow
Incident 경로만 검증한다. Email/SES는 이번 Phase 범위 밖이다.

## 9. 기존 구성 회귀 확인

```bash
kubectl -n monitoring get pods                      # prometheus/grafana/kube-state-metrics/node-exporter 모두 Running
kubectl -n monitoring port-forward svc/prometheus 9090:9090
curl.exe "http://localhost:9090/api/v1/targets" | Select-String health | Select-String -NotMatch '"up"'
```

- Grafana dashboard(uid `prometheus` datasource) 정상 렌더 확인.
- `kubectl -n devflow get deploy backend -o jsonpath='{.spec.template.spec.containers[0].image}'`
  불변 확인, Argo CD `devflow` Application Sync 상태 유지.

## 10. Rollback

```bash
helm -n monitoring uninstall devflow-alertmanager devflow-alloy   # 승인 필요
helm -n monitoring uninstall devflow-loki                          # 승인 필요
```

- Loki PVC: `enableStatefulSetAutoDeletePVC: false`이므로 uninstall 후 PVC가
  **남는다(로그 데이터 보존)**. 완전 삭제는 명시적 승인 하에
  `kubectl -n monitoring delete pvc data-loki-0` 별도 수행.
  재설치 시 동일 PVC가 재바인딩되어 과거 로그가 유지될 수 있다.
- 개별 롤백: `helm -n monitoring rollback devflow-loki <rev>` 등.
- Grafana datasource 원복: git 직전 버전의 `k8s/monitoring/monitoring.yaml`을
  재apply 후 `kubectl -n monitoring rollout restart deploy/grafana`.
- Secret 원복은 필요 없음(그대로 잔존, 삭제 선택 가능).
- Backend/Prometheus/Grafana/AWS 변경은 없으므로 rollback 대상이 아니다.

## 11. 검증 상태 분리

- 설정·차트 구현과 로컬 렌더 검증: Phase 3.4 Build 보고서 §Local Test Results.
- 본 문서의 live 명령(§1 게이트 포함 §2~§9): EKS 접근 승인 후 수행, 미수행 시
  NOT RUN 보고. 7일 retention 실삭제 관측과 노드 스케일 변경 시 Alloy 중복
  방지 재검증은 live 관측 항목으로 분리한다.
