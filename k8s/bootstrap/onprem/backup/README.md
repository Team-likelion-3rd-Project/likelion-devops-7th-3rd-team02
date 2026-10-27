# 온프레미스 PostgreSQL 정기 백업

## 구성

- 네임스페이스: devflow
- CronJob: postgresql-backup
- 실행 시각: 매일 18:00, Asia/Seoul
- 예약 활성화: suspend=false
- 실행 지연 허용: 1시간
- 예약 Job 중복 실행 방지: concurrencyPolicy=Forbid
- 대상: devflow DB의 public 스키마
- 형식: pg_dump custom archive
- 인증: backend-secret의 DB_USERNAME·DB_PASSWORD 참조
- 저장 노드: onprem-worker-02
- 저장 경로: /srv/devflow/postgresql-backups
- PVC: postgresql-backup-data
- PV: onprem-postgresql-backup-pv, Retain
- 파일명 시각: UTC

## 사전 준비

worker-02 SSH에서 실행한다.

    sudo install -d -o 999 -g 999 -m 0700 /srv/devflow/postgresql-backups

namespace devflow, PostgreSQL Service, backend-secret 및
onprem-local StorageClass가 먼저 존재해야 한다.

## 적용

아래 명령은 kubectl 접근 권한이 있는 CP SSH에서,
저장소 루트 디렉터리를 기준으로 실행한다.

    kubectl apply --dry-run=server -f k8s/bootstrap/onprem/backup/postgresql-backup.yaml
    kubectl apply -f k8s/bootstrap/onprem/backup/postgresql-backup.yaml

이 디렉터리는 현재 devflow-onprem Application의 동기화 대상인
k8s/overlays/onprem 외부에 있다. 운영자가 별도로 적용한다.

새 환경에서는 suspend=true로 먼저 적용하고,
수동 Job과 실제 복원 검증을 마친 뒤 예약을 활성화한다.

## 백업 검증 및 보관

1. 임시 파일로 pg_dump 실행
2. 파일 크기 및 pg_restore --list 성공 확인
3. 최종 파일명으로 변경
4. SHA-256 생성 및 검증
5. 위 단계 성공 후 7일보다 오래된 백업과 체크섬 삭제

보관 정리는 성공한 백업 실행 시 수행한다.
PV 선언 용량 1Gi는 디렉터리의 실제 디스크 사용량 제한이 아니다.

## 수동 실행

CP SSH에서 실행한다.

    BACKUP_JOB="postgresql-backup-check-$(date -u +%Y%m%d%H%M%S)"
    kubectl create job -n devflow "$BACKUP_JOB" --from=cronjob/postgresql-backup
    kubectl get job "$BACKUP_JOB" -n devflow
    kubectl logs -n devflow "job/$BACKUP_JOB" --pod-running-timeout=60s

수동 Job은 예약 Job과 별도로 생성되므로,
예약 실행 또는 다른 백업 Job과 겹치지 않도록 확인한다.

## 복원 원칙

- 운영 DB에 덮어쓰지 않고 별도 검증 DB에 먼저 복원한다.
- 검증 DB는 template0 기반, 소유자 devflow_app으로 생성한다.
- 이 public 스키마 백업에는 CREATE SCHEMA public이 포함된다.
- 새 검증 DB의 빈 public 스키마를 DROP SCHEMA public로 제거한다.
- CASCADE를 사용하지 않는다. 객체가 있으면 중단하고 확인한다.
- 운영 DB에서는 위 스키마 삭제 명령을 실행하지 않는다.
- pg_restore에 다음 옵션을 사용한다.
  --no-owner --role=devflow_app --no-privileges --single-transaction --exit-on-error
- 복원 후 Flyway 기록, 테이블 소유자, 프로젝트·업무 데이터를 확인한다.
- 앱 연결 검증은 별도 Backend를 사용한다.

## 검증 결과: 2026-10-26

- 수동 Job: postgresql-backup-check-20261026081630
- Job Complete, 체크섬 OK
- worker-02에서 CP로 복사 후 체크섬 OK
- 복원 DB: devflow_restore_cron_20261026_081816
- Flyway V1~V7 모두 success=true
- public 테이블 12개 모두 소유자 devflow_app
- 프로젝트 2개 및 업무 각 1건 보존 확인
- 예약 활성화 확인
- 실제 예약 시각의 자동 실행 성공은 추가 확인 필요

앞서 10월 19일 백업의 별도 복원 DB에서는
검증용 Backend 기동·기존 계정 로그인·프로젝트 조회도 확인했다.
이번 정기 백업 파일의 복원 검증과는 별도 결과로 구분한다.

## 범위 및 제한

- infra_check 검증용 스키마는 제외한다.
- PostgreSQL 역할·비밀번호, Kubernetes Secret, etcd,
  PV 파일 전체를 포함하는 백업은 아니다.
- DB는 worker-01, 백업은 worker-02에 저장하지만 같은 노트북에 있다.
- 노트북 전체 장애에 대비한 외부 저장소 사본은 별도로 필요하다.
- VM이 꺼져 있으면 예약 실행을 보장할 수 없다.
- 백업·체크섬·Secret 원문은 Git에 커밋하지 않는다.
