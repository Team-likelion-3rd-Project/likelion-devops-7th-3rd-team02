# 온프레미스 배포 이력 자동 기록

## 구성

- Job: devflow-backend-deployment-record
- 네임스페이스: devflow
- Argo CD 훅: PostSync
- 이전 Job 정리: BeforeHookCreation
- Secret: devflow-project-webhooks
- 참조 키: deployment-token
- 전송 대상: Backend /api/webhooks/deployments
- 기록 상태: SUCCESS
- 클러스터 API 접근용 서비스 계정 토큰은 마운트하지 않는다.

## 실행 순서

1. AppProject에 batch/Job 허용을 별도로 적용한다.
2. Argo CD Application의 추적 커밋을 배포할 머지 커밋으로 변경한다.
3. 비교 결과를 확인하고 전체 동기화를 실행한다.
4. 리소스 동기화와 정상 상태 확인 후 PostSync Job이 실행된다.
5. Job이 Backend readiness를 확인하고 배포 이력을 전송한다.
6. Job 로그와 DevFlow 배포 이력 화면에서 결과를 확인한다.

선택한 리소스만 동기화하는 방식에서는 훅이 실행되지 않는다.
AppProject 파일은 bootstrap 경로에 있으므로 기존 Application이 적용하지 않는다.
Job 매니페스트를 kubectl로 직접 적용해 훅 검증을 대신하지 않는다.

## 배포 메타데이터 관리

Job의 RELEASE_COMMIT_SHA와 RELEASE_IMAGE_DIGEST를 사용한다.
현재 최초 구성은 검증된 릴리스 커밋 91febe18e3164459dd48f0acbc81bef582a263fe와
Backend digest f5106c40336be51fbe74b8bfc5240fbefd0c967113fd70c386d014d17c73934e를 기록한다.

RELEASE_COMMIT_SHA는 명시적으로 관리하는 릴리스 기준 커밋이며,
PostSync Job을 추가한 GitOps 커밋을 자동으로 읽는 값이 아니다.

Backend 이미지 변경 PR에서는 다음을 함께 갱신한다.

- kustomization.yaml의 Backend 이미지 digest
- Job의 RELEASE_IMAGE_DIGEST
- 해당 릴리스를 식별하는 RELEASE_COMMIT_SHA

릴리스 기준 커밋과 이미지의 대응 관계를 PR에 기록하고,
동기화 전에 렌더링 결과와 실행할 이미지를 대조한다.
Frontend 배포 이력 자동 기록은 이번 구성에 포함하지 않는다.

## 실패 및 재실행

- readiness 확인 또는 Webhook 전송 실패 시 Job이 실패한다.
- backoffLimit=0으로 자동 재시도를 하지 않는다.
- 전송 성공 직후 통신이 끊기면 기록 여부가 불명확할 수 있으므로 재실행 전 이력을 확인한다.
- Job 실패가 이미 적용된 Deployment를 자동으로 되돌리지는 않는다.
- 다음 전체 동기화에서 이전 Job을 삭제하고 새로 실행한다.
- pipelineId를 생략하므로 같은 릴리스 재동기화 시 이력이 추가될 수 있다.
- 중복 방지는 실제 배포 식별자 설계와 함께 후속 보완한다.

## 검증 상태

- Kustomize 렌더링 성공
- AppProject 변경 범위: batch/Job 추가
- 토큰 원문 없이 Secret 참조
- 실제 PostSync 실행 및 자동 이력 생성: 배포 후 확인 필요

## 보안

Secret 원문을 Git에 저장하지 않는다.
토큰은 환경변수로 주입하고 curl 설정 표준입력으로 전달한다.
토큰 원문을 명령 인수나 로그에 출력하지 않는다.
