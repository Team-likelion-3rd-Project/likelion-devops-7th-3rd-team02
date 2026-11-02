# 온프레미스 Alertmanager 연동

## 구성

- Helm 릴리스: onprem-monitoring
- 네임스페이스: monitoring
- Prometheus 차트: 29.37.0
- Alertmanager: onprem-alertmanager, 1개
- 배치 노드: onprem-worker-02
- Service: ClusterIP, 9093
- 외부 Ingress: 사용하지 않음
- 저장소: emptyDir
- Receiver: DevFlow Backend Webhook
- send_resolved: true

## 파일 구성

- values.yaml: 기존 Prometheus·수집 대상 설정
- alertmanager-values.yaml: Alertmanager 및 Prometheus 알림 전달 설정
- tests/alert-test-values.yaml: 별도 수동 검증용 규칙, 기본 비활성 조건

운영 적용에는 테스트 파일을 포함하지 않는다.
Backend 가용성 규칙을 유지하려면 Helm 적용 시
backend-alert-values.yaml도 함께 지정한다.

## Secret 준비

monitoring 네임스페이스에 다음 Secret이 먼저 필요하다.

- 이름: devflow-alertmanager-webhook
- 키: alertmanager-token

DevFlow 프로젝트 소유자가 화면에서 발급한 Alertmanager 토큰을 사용한다.
현재 devflow-project-webhooks Secret의 원본 토큰과 동일한 값이다.
토큰 재발급 시 두 네임스페이스의 사본을 함께 갱신한다.

컨테이너는 다음 파일로 토큰을 읽는다.

    /etc/alertmanager/devflow/alertmanager-token

토큰 원문과 실제 Secret 매니페스트는 Git에 저장하지 않는다.

## 운영 적용

아래 명령은 저장소 루트 기준으로 CP SSH에서 실행한다.
필요한 파일이 CP에 복사되어 있어야 한다.

    helm template onprem-monitoring prometheus-community/prometheus --version 29.37.0 --namespace monitoring -f k8s/bootstrap/onprem/monitoring/values.yaml -f k8s/bootstrap/onprem/monitoring/alertmanager-values.yaml -f k8s/bootstrap/onprem/monitoring/backend-alert-values.yaml > /tmp/onprem-monitoring-rendered.yaml

    helm upgrade --install onprem-monitoring prometheus-community/prometheus --version 29.37.0 --namespace monitoring -f k8s/bootstrap/onprem/monitoring/values.yaml -f k8s/bootstrap/onprem/monitoring/alertmanager-values.yaml -f k8s/bootstrap/onprem/monitoring/backend-alert-values.yaml --wait --timeout 10m

이 경로는 현재 DevFlow Argo CD Application의 동기화 대상이 아니다.
Helm 변경은 운영자가 별도로 실행한다.

## 테스트 절차

1. 테스트 파일을 복사한 작업용 파일에서 조건을 vector(1)로 변경한다.
2. 운영 values 두 파일과 작업용 테스트 파일을 함께 적용한다.
3. Prometheus에서 DevFlowWebhookTest가 firing인지 확인한다.
4. DevFlow에 경고 장애가 생성되는지 확인한다.
5. 작업용 테스트 조건을 vector(0) > 0으로 변경하고 다시 적용한다.
6. Prometheus의 활성 테스트 알림이 사라지는지 확인한다.
7. DevFlow에서 현재 안정화됨 표시를 확인한다.
8. 확인 버튼으로 장애를 ACKNOWLEDGED 상태로 만든다.
9. 알림 해제와 사용자 확인 중 늦은 시각부터 30분 동안 재발하지 않으면 자동 해결되는지 확인한다.
10. 검증 후 테스트 파일 없이 운영 values 두 파일만 다시 적용한다.

자동 해결 작업은 기본 1분 간격이다.
OPEN 상태는 알림이 해제되어도 자동으로 닫히지 않는다.
자동 해결 검증 중에는 해결 버튼으로 직접 종료하지 않는다.

## 검증 결과: 2026-10-27

- Alertmanager 2/2 Running, 설정 오류 없이 기동
- Prometheus의 activeAlertmanagers에서 연결 확인
- 테스트 규칙 firing 확인
- DevFlow 경고 장애 1건 생성 확인
- 조건 해제 후 활성 테스트 알림 0건 확인
- Webhook 전송 2회, 전송 실패 0회
- Backend에서 기존 장애 갱신 확인
- DevFlow 현재 안정화됨 표시 확인
- 사용자 확인 후 ACKNOWLEDGED, firing=false 확인
- 알림 해제 시각: 10:35:15.613, 한국 시간
- 사용자 확인 시각: 10:39:53.885523, 한국 시간
- 자동 해결 기준 시각: 11:09:53.885523, 한국 시간
- 자동 해결 완료: 11:10:46.686156, 한국 시간
- DB RESOLVED, firing=false 및 Backend 자동 해결 로그 확인
- 브라우저 최근 해결 1건 표시 확인

## 운영 제한

- 테스트 규칙은 실제 장애 감지 규칙을 대체하지 않는다.
- 실제 Pod·서비스 장애 규칙은 별도 설계·검증이 필요하다.
- emptyDir이므로 Pod 재생성 시 알림 억제 및 중복 전송 방지 상태가 초기화될 수 있다.
- DevFlow DB에 저장된 장애 이력은 Alertmanager 저장소와 별개다.
- 토큰이 속한 프로젝트에 알림이 기록되므로 시연 프로젝트 변경 시 토큰을 재설정한다.

## Backend 가용성 알림

- 규칙 파일: backend-alert-values.yaml
- 대상: devflow 네임스페이스의 backend Deployment
- 조건: 목표 Pod 수가 0보다 크고 사용 가능한 Pod 수가 0
- 지속 시간: 2분
- 심각도: warning
- 환경: dev

2026-10-27 정상 상태 검증:
- 규칙 health=ok, state=inactive
- 활성 알림 없음, Alertmanager 연결 정상
- 실제 Backend 중단과 규칙 발생 검증은 아직 수행하지 않음

Backend가 완전히 중단되면 같은 Backend의 Webhook도 수신할 수 없다.
복구 후 전달 여부를 검증해야 하며, 장애 중 독립 알림 경로는 별도 구성한다.
kube-state-metrics 지표가 없는 상황을 감지하는 규칙도 별도 필요하다.

적용 시 운영 values.yaml, alertmanager-values.yaml,
backend-alert-values.yaml을 순서대로 모두 지정한다.
