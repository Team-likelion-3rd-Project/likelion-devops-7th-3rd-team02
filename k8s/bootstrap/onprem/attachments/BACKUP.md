# 온프레미스 첨부파일 백업 및 복원

## 구성

- CronJob: devflow/attachment-backup
- 실행 시각: 매일 18:10, Asia/Seoul
- 예약 활성화: suspend=false
- 동시 실행 방지: concurrencyPolicy=Forbid
- 예약 지연 허용: 1시간
- 실행 제한: 300초, 실패 재시도 없음
- 실행 노드: onprem-worker-01
- 원본 PVC: attachments-data
- 원본 연결: /source, 읽기 전용
- 백업 PVC: attachment-backup-data
- 백업 PV: devflow-attachment-backup-pv, Retain
- 백업 경로: /srv/devflow/attachment-backups
- 형식: tar.gz 및 SHA-256 파일
- 파일명 시각: UTC
- 보관: 정상 생성된 최근 아카이브 3개와 체크섬 파일

## 실행 권한

원본 디렉터리가 root:root, 권한 0700이므로 백업은 root로 실행한다.
원본은 읽기 전용으로 연결하며 컨테이너의 추가 권한과 권한 상승을 차단한다.
루트 파일시스템은 읽기 전용이고 Kubernetes API 토큰도 마운트하지 않는다.
DB나 OAuth 인증정보는 사용하지 않는다.

## 용량 및 보관 정책

- 원본이 1Gi를 초과하면 백업을 중단한다.
- 원본 크기만큼 저장한 뒤에도 1Gi 여유 공간을 확보할 수 있어야 실행한다.
- 임시 파일로 생성하고 아카이브 목록 검사 후 최종 이름으로 변경한다.
- SHA-256 검증 성공 후 오래된 백업을 정리한다.
- 정리는 이 백업이 생성한 attachments-*.tar.gz 파일을 대상으로 한다.
- PV의 3Gi는 용량 선언이며 디렉터리 사용량을 강제 제한하지 않는다.
- 원본 크기 제한과 보관 개수 변경 시 노드 디스크 여유를 함께 검토한다.

## 설치

worker-01에서 디렉터리를 준비한다.

    sudo install -d -o root -g root -m 0700 /srv/devflow/attachment-backups

최초 설치 때는 attachment-backup.yaml의 suspend를 true로 설정해 적용하고,
수동 백업과 복원 검증 후 false로 변경하여 예약을 활성화한다.

저장소 루트의 CP 터미널에서 적용한다.

    kubectl apply --dry-run=server -f k8s/bootstrap/onprem/attachments/attachment-backup.yaml
    kubectl apply -f k8s/bootstrap/onprem/attachments/attachment-backup.yaml

이 파일은 bootstrap 설정이며 기존 Argo CD Application의 동기화 대상이 아니다.

## 수동 실행

CP 터미널에서 실행한다.

    BACKUP_JOB="attachment-backup-check-$(date -u +%Y%m%d%H%M%S)"
    kubectl create job "$BACKUP_JOB" --from=cronjob/attachment-backup -n devflow
    kubectl wait -n devflow "job/$BACKUP_JOB" --for=condition=complete --timeout=300s
    kubectl logs -n devflow "job/$BACKUP_JOB"

concurrencyPolicy는 CronJob이 예약 생성한 Job 사이에 적용된다.
수동 Job을 실행하기 전에는 다른 백업 Job이 동작 중인지 확인한다.
수동 Job을 중복 실행하지 않는다.

## 복원 검증 절차

1. 테스트 첨부파일을 업로드하고 원본 SHA-256을 기록한다.
2. 검증 중 해당 파일을 수정하거나 삭제하지 않는다.
3. 수동 백업이 Complete인지 확인한다.
4. worker-01에서 아카이브의 SHA-256을 검사한다.
5. mktemp로 운영 경로와 분리된 권한 0700의 새 디렉터리를 생성한다.
6. 해당 경로에 tar.gz를 해제한다.
7. 복원 파일의 SHA-256을 백업 전 원본과 비교한다.

검증 복원은 운영 /srv/devflow/attachments에 덮어쓰지 않는다.
외부에서 받은 임의의 아카이브를 root로 해제하지 않는다.

## 확인한 결과

2026-11-02 수동 검증:

- 테스트 파일 1개를 포함한 백업 Job Complete
- 아카이브 목록 검사 및 SHA-256 검사 성공
- 별도 디렉터리로 복원 성공
- 복원된 50바이트 테스트 파일과 원본 체크섬 일치
- Windows 사본 복사 및 체크섬 일치

검증 Job: attachment-backup-check-20261102145848
Windows 보관 경로: D:\DevFlow-backups\attachments

예약 활성화는 확인했으며 실제 18:10 예약 실행 성공은 별도 확인이 필요하다.
3개 초과 백업 생성 후 자동 정리 동작과 대용량 백업은 아직 검증하지 않았다.

## DB와 파일의 일관성

기존 PostgreSQL 백업은 매일 18:00, 파일 백업은 18:10에 실행한다.
서로 다른 작업이므로 두 결과가 같은 시점의 상태를 보장하지 않는다.
백업 중 업로드·삭제가 발생하면 DB 메타데이터와 파일이 불일치할 수 있다.

통합 복구에는 업무 변경을 통제한 DB·파일 백업 세트와 함께
다운로드까지 검증하는 별도 절차가 필요하다.
현재 검증은 첨부파일 본문의 개별 백업·복원 검증이다.

## 장애 범위와 운영 제한

- 원본과 백업이 같은 worker-01 디스크에 있어 노드 장애 대비가 아니다.
- Windows 사본도 같은 노트북에 있어 노트북 자체 장애 대비가 아니다.
- 별도 장비나 외부 저장소 사본은 후속 작업이다.
- 파일 변경 중 tar 오류가 발생하면 성공으로 처리하지 않는다.
- VM이 꺼져 있거나 예약 지연 허용 시간을 넘으면 실행을 보장하지 않는다.
- 테스트 파일, 복원 디렉터리, 백업 사본은 검증 결과 확인 후 별도 정리한다.
