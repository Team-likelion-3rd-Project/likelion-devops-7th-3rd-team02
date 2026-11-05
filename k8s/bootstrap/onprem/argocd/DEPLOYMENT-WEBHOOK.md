# 온프레미스 배포 이력 자동 기록

## 구성

- Job: devflow-backend-deployment-record
- 네임스페이스: devflow
- Argo CD 훅: PostSync
- 이전 Job 정리: BeforeHookCreation
- Secret: devflow-aws-project-webhooks
- 참조 키: deployment-token
- 전송 대상: https://devflowlab.net/api/webhooks/deployments
- 기록 환경: dev
- 기록 서비스: backend
- 기록 상태: SUCCESS
- readiness 검사 대상: 온프레미스 Backend
- 클러스터 API 접근용 서비스 계정 토큰은 마운트하지 않는다.

## 사전 준비

AWS DevFlow의 최종 시연 프로젝트에서 deployment 토큰을 발급한다.
토큰은 devflow 네임스페이스의 devflow-aws-project-webhooks Secret에
deployment-token 키로 저장한다.

기존 devflow-project-webhooks Secret은 온프레미스 프로젝트용으로 보존한다.
Secret 값은 Git이나 문서에 저장하지 않는다.

## 실행 순서

1. AppProject에 batch/Job 허용이 적용되어 있는지 확인한다.
2. Argo CD Application의 추적 커밋을 배포할 머지 커밋으로 변경한다.
3. 온프레미스 overlay 전체 비교 결과를 확인한다.
4. 전체 동기화를 실행한다.
5. 리소스 정상 상태 확인 후 PostSync Job이 실행된다.
6. Job이 온프레미스 Backend readiness를 확인한다.
7. AWS DevFlow 프로젝트로 배포 이력을 전송한다.
8. Job 로그와 AWS DevFlow 배포 이력에서 결과를 확인한다.

선택한 리소스만 동기화하면 훅이 실행되지 않는다.
AppProject는 bootstrap 경로이므로 기존 Application이 적용하지 않는다.
Job을 kubectl로 직접 적용하는 것으로 PostSync 검증을 대신하지 않는다.
자동 동기화 활성화 여부와 PostSync 자동 실행은 별개의 설정이다.

## 배포 메타데이터 관리

현재 이미지의 기준 정보:

- RELEASE_COMMIT_SHA: 9f72deab85343bfc99f0abdc14ac7e1547dc22d6
- RELEASE_IMAGE_DIGEST: sha256:5e10574f26b8a8013f6b7331195d362bb5d5f78acea49f13e30554c5f9311dd1
- pipelineId: 41397977596

이번 전송 대상 변경에서는 이미지와 배포 메타데이터를 유지한다.
RELEASE_COMMIT_SHA는 이미지에 대응하는 릴리스 기준 커밋이며,
PostSync 설정을 바꾼 GitOps 커밋과 같을 필요는 없다.

Backend 이미지 변경 시 다음을 함께 갱신한다.

- kustomization.yaml의 Backend 이미지 digest
- Job의 RELEASE_IMAGE_DIGEST
- 이미지에 대응하는 RELEASE_COMMIT_SHA
- 해당 이미지를 빌드한 GitHub Actions run ID인 pipelineId

Frontend 배포 이력 자동 기록은 이 Job에 포함하지 않는다.
AWS production 배포용 훅은 별도 구성이다.

## 실패 및 재실행

- readiness 검사 또는 AWS Webhook 전송 실패 시 Job이 실패한다.
- backoffLimit=0으로 자동 재시도하지 않는다.
- 전송 결과가 불명확하면 재실행 전에 AWS 배포 이력을 확인한다.
- Job 실패가 이미 적용된 Deployment를 자동으로 되돌리지는 않는다.
- 다음 전체 동기화에서 이전 Job을 삭제하고 새로 실행한다.
- 같은 pipelineId와 service로 전송하면 기존 이력을 갱신한다.
- pipelineId를 생략한 수동 검증 이력은 자동 기록과 별도로 남는다.

## 검증 상태

- AWS readiness HTTP 200 확인
- AWS 프로젝트 토큰으로 수동 배포 Webhook HTTP 200 확인
- AWS 배포 이력 ID 2와 수동 검증 설명 표시 확인
- AWS 대상 PostSync 실제 실행: 머지 및 동기화 후 확인 필요
- 동일 릴리스 재동기화 시 이력 ID 유지: 확인 필요

## 보안

토큰은 Secret에서 환경변수로 주입한다.
인증 헤더는 curl 설정 표준입력으로 전달한다.
토큰 원문을 명령 인수나 로그에 출력하지 않는다.
