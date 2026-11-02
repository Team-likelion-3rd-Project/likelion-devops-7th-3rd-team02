# 온프레미스 첨부파일 저장소

## 구성

- 저장 방식: local
- 저장 노드: onprem-worker-01
- 노드 디렉터리: /srv/devflow/attachments
- PV: devflow-attachments-pv
- PVC: devflow/attachments-data
- 선언 용량: 1Gi
- 접근 모드: ReadWriteOnce
- 회수 정책: Retain
- Backend 마운트 경로: /app/attachments
- ATTACHMENT_STORAGE: local
- ATTACHMENT_LOCAL_DIR: /app/attachments

Backend의 현재 실행 사용자인 root에 맞춰 노드 디렉터리를
root:root, 권한 0700으로 준비했다.
실행 사용자를 변경할 때는 디렉터리 권한도 함께 검토해야 한다.

## 사전 준비 및 적용

worker-01에서 실행한다.

    sudo install -d -o root -g root -m 0700 /srv/devflow/attachments

저장소 루트의 CP 터미널에서 실행한다.

    kubectl apply --dry-run=server -f k8s/bootstrap/onprem/attachments/storage.yaml
    kubectl apply -f k8s/bootstrap/onprem/attachments/storage.yaml

PV/PVC는 bootstrap 리소스이며 기존 Argo CD Application의
동기화 대상에 포함하지 않는다.
Backend 배포 전에 PVC 상태와 worker-01의 디스크 여유를 확인한다.

    kubectl get pv devflow-attachments-pv
    kubectl get pvc attachments-data -n devflow

## 배포 대상

- 소스 커밋: 9f72deab85343bfc99f0abdc14ac7e1547dc22d6
- 이미지 빌드 실행 번호: 41397977596
- Backend와 Frontend의 새 GHCR 경로 및 digest는 onprem overlay에서 관리
- PostSync의 릴리스 정보도 Backend 이미지와 함께 갱신
- Backend 최초 기동 시 Flyway V8 첨부파일 테이블 적용 예상

## 검증 상태

2026-11-02 확인:

- worker-01 디렉터리 생성 완료
- PV와 PVC Bound 확인
- Kustomize 렌더링 성공
- Backend 볼륨 및 저장 경로 설정 확인
- 새 이미지 배포와 아래 기능 검증은 아직 진행 전

배포 후 확인할 항목:

- Backend 준비 상태와 Flyway V1~V8 성공
- 첨부파일 업로드, 목록, 다운로드 내용 일치, 삭제
- Backend Pod 재생성 후 첨부파일 보존
- p95 계산용 http_server_requests_seconds_bucket 지표 노출
- PostSync 배포 이력과 pipelineId 일치
- 기본 업무 관리와 모니터링 기능 정상 동작

## 백업 및 운영 제한

- 기존 PostgreSQL 백업에는 첨부파일 메타데이터만 포함된다.
- 파일 본문은 이 디렉터리에 저장되므로 별도 백업이 필요하다.
- DB와 파일 본문의 일관성을 고려한 백업·복구 절차는 후속 작업이다.
- 1Gi는 PV 용량 선언이며 실제 디렉터리 사용량을 강제 제한하지 않는다.
- worker-01 또는 노트북 장애 시 다른 노드에서 자동으로 사용할 수 없다.
- Backend는 단일 Pod와 Recreate 전략이므로 배포 중 일시 중단될 수 있다.
- Retain은 데이터 회수 정책이며 별도 백업을 대체하지 않는다.
- PVC/PV 또는 노드 디렉터리를 운영 데이터 확인 없이 삭제하지 않는다.

## 배포 전 백업 및 롤백

2026-10-29 예약 백업을 별도 검증 DB에 복원해
Flyway V1~V7, public 테이블 12개, 프로젝트 2개와 업무 각 1건을 확인했다.
이는 해당 백업 시점의 복원 검증이며 최신 운영 데이터 백업은 아니다.

실제 배포 직전에 당일 DB 백업을 추가로 확보한다.
V8 적용 후 이전 이미지와의 호환성은 별도로 확인해야 한다.
이미지 롤백만으로 DB 스키마가 이전 상태로 돌아가지는 않는다.

운영 DB에서 V8 테이블이나 Flyway 이력을 임의로 삭제하지 않는다.
DB 복원이 필요하면 배포 이후 데이터 손실 범위와 파일 본문을 함께 검토한다.
