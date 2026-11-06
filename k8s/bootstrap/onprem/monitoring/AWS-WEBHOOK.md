# 온프레미스 알림의 AWS DevFlow 전송

## 목적

온프레미스 Backend에 장애가 발생해도 AWS DevFlow가 알림을 수신하도록
Alertmanager의 Webhook 전송 대상을 AWS로 연결한다.

## 설정 파일

- 기존 온프레미스 수신 설정: alertmanager-values.yaml
- AWS 수신 설정: alertmanager-aws-values.yaml
- AWS 수신 주소: https://devflowlab.net/api/webhooks/alertmanager
- send_resolved: true
- Secret 네임스페이스: monitoring
- Secret 이름: devflow-aws-alertmanager-webhook
- 참조 키: alertmanager-token
- 마운트 경로: /etc/alertmanager/devflow
- 인증 파일: /etc/alertmanager/devflow/alertmanager-token

AWS 프로젝트에서 발급한 alertmanager 토큰을 사용한다.
devflow 네임스페이스의 devflow-aws-project-webhooks와
monitoring 네임스페이스의 devflow-aws-alertmanager-webhook는 별도 Secret이다.
토큰을 재발급하면 두 Secret의 해당 키를 함께 갱신한다.

## 적용 방식

변경 전 Helm 사용자 values와 기존 설정을 백업한다.
백업한 전체 values에 AWS 설정 파일을 마지막으로 추가해 렌더링한다.
차트 버전 29.37.0을 고정하고 렌더링 결과를 검토한 뒤 적용한다.
이 설정은 bootstrap 관리 대상이며 Argo CD Application이 적용하지 않는다.

기존 알림 규칙과 Prometheus 수집 설정이 유지되는지 확인한다.
Alertmanager 재시작 후 새 Secret 마운트와 설정 오류 여부를 확인한다.

## 확인한 결과

- Helm 릴리스 onprem-monitoring revision 7 적용
- Alertmanager와 Prometheus 모두 2/2 Running
- AWS 알림 Secret 마운트 확인
- DevFlowAwsWebhookTest 테스트 알림 접수 HTTP 200
- AWS 최종 시연 프로젝트에서 테스트 장애 생성 확인
- 종료 알림 전달 후 현재 안정화됨 표시 확인
- 화면에서 해결 처리 완료

테스트 알림은 Alertmanager API에 직접 입력했다.
따라서 위 결과는 Alertmanager에서 AWS DevFlow로의 전송 검증이며,
Prometheus의 실제 장애 감지 검증을 대신하지 않는다.

## 남은 통합 검증

- AWS Backend에서 온프레미스 Prometheus 조회
- 실제 온프레미스 Backend 준비 상태 실패 주입
- AWS 화면 유지와 장애 배지 및 배너 확인
- 복구 후 알림 종료와 장애 해결 확인
- 단계별 실제 소요 시간 기록

현재 Backend 장애 규칙은 2분 지속 조건이다.
직접 Webhook을 보내는 API 검사와 실제 장애 감지 시간을 구분한다.

## 복구 및 제한

문제가 발생하면 변경 전 전체 Helm values로 복구한다.
기존 Secret은 검증 완료 전 삭제하지 않는다.
Alertmanager 영속 저장은 비활성화 상태다.
노트북과 온프레미스 VM이 실행 중이어야 알림 전송이 가능하다.
DB와 Secret 원문, OAuth 인증정보는 Git에 저장하지 않는다.
