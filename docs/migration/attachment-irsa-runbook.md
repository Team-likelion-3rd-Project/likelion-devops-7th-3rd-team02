# S3 Attachment & IRSA AWS 검증 Runbook

이 문서의 모든 AWS / EKS / Argo CD 작업은 **운영 승인 후**에만 수행한다.
Build 단계에서는 작성만 하고 실행하지 않았다 (AWS Live Test — NOT RUN).

## 0. 사전 확인

```bash
aws sts get-caller-identity            # 대상 계정 확인
kubectl config current-context         # dev EKS 클러스터 확인
terraform -chdir=terraform/environments/dev plan   # apply 전 diff 검토 (승인 필요)
```

- `terraform plan` 출력에 `module.attachment_storage` 신규 리소스만 추가되고
  기존(frontend-hosting, vpc, eks, rds 등) 리소스의 변경·파괴가 없어야 한다.

## 1. Terraform Apply (승인 필요)

```bash
terraform -chdir=terraform/environments/dev apply -target=module.attachment_storage
```

생성되는 것:

| 리소스                                          | 확인                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| S3 Bucket `devflow-dev-attachment-{account}`    | Private, SSE-S3(AES256), BucketOwnerEnforced, Versioning 미사용                                           |
| Public Access Block                             | 4개 설정 전부 true                                                                                        |
| Lifecycle                                       | 미완료 Multipart Upload 7일 정리                                                                          |
| IAM Role `devflow-dev-backend-attachments-role` | Trust: EKS OIDC, sub=`system:serviceaccount:devflow:backend-sa`, aud=`sts.amazonaws.com`                  |
| IAM Policy                                      | `{bucket}/*`에 `PutObject/GetObject/DeleteObject`만. **ListBucket(버킷 나열)·bucket 자체 대상 액션 없음** |

## 2. GitOps values 반영 (승인 필요 — devflow-gitops repo 수정)

`terraform output` 값으로 GitOps repo의 `values/aws-dev.yaml`에 추가:

```yaml
backend:
  irsa:
    roleArn: <terraform output backend_attachments_irsa_role_arn>
  attachment:
    bucket: <terraform output attachment_bucket_name>
    maxFileSizeMb: "10"
```

- 두 값이 비어 있으면 렌더링은 Phase 3.1 baseline과 동일해야 한다(로컬 검증 완료).
- `backend.attachment.storage`는 비워 두면 bucket 설정 시 `s3`로 자동 설정된다.
- 이미지 tag·targetRevision 갱신 방식(GitHub Actions)은 그대로다.

## 3. 배포 후 IRSA / Pod 검증

```bash
kubectl get sa backend-sa -n devflow -o yaml   # eks.amazonaws.com/role-arn annotation 확인
kubectl get deploy backend -n devflow -o yaml  # aws-token projected volume / volumeMount / env 5종 확인
kubectl get pods -n devflow -l app=backend -o yaml | grep -A4 volumes:
```

중점 확인(AWS webhook 동작 검증):

1. Pod spec에 `aws-token` Volume이 **중복 없이 하나**만 존재하는가
   (Chart가 projected volume과 env 4종+AWS_STS_REGIONAL_ENDPOINTS를 선행 주입하므로
   EKS webhook이 컨테이너를 skip하는 것이 정상. 스킵되지 않고 중복이 생기면 webhook 동작 재검토).
2. `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`, `AWS_REGION`, `AWS_DEFAULT_REGION`,
   `AWS_STS_REGIONAL_ENDPOINTS` 환경변수가 중복 없이 존재하는가.
3. `automountServiceAccountToken: false`가 유지되는가.
4. Pod 안 토큰 파일 존재·만료 확인:
   `kubectl exec -n devflow deploy/backend -- sh -c 'ls -l /var/run/secrets/eks.amazonaws.com/serviceaccount/token'`

## 4. STS 인증 및 S3 접근

```bash
# Pod 내부에서 web identity로 발급되는 자격 증명 확인
kubectl exec -n devflow deploy/backend -- sh -c 'env | grep -i aws_'
# S3 접근 스모크 (Backend 이미지를 쓰는 임시 Pod 권장; aws cli 사이드카 없이 확인하려면 5단계 API 테스트로 대체)
```

- `AccessDenied` → IAM Role trust Condition(namespace/SA/aud)과 policy resource 확인
- `InvalidIdentityToken` → cluster OIDC provider와 `AWS_STS_REGIONAL_ENDPOINTS=regional` 확인

## 5. 첨부파일 API E2E

```bash
API=https://<app-host>/api
TOKEN=<JWT>
# 업무 생성/조회 후:
curl -fsS -H "Authorization: Bearer $TOKEN" -F "file=@sample.txt" \
  $API/projects/$PID/tasks/$TID/attachments                 # A2 업로드
curl -fsS -H "Authorization: Bearer $TOKEN" \
  $API/projects/$PID/tasks/$TID/attachments                 # A1 목록
curl -fsS -H "Authorization: Bearer $TOKEN" -o out.txt -D - \
  $API/projects/$PID/tasks/$TID/attachments/$AID            # binary 다운로드:
  # Content-Disposition: attachment, X-Content-Type-Options: nosniff 확인
curl -fsS -H "Authorization: Bearer $TOKEN" -X DELETE \
  $API/projects/$PID/tasks/$TID/attachments/$AID            # A4 삭제
```

- 업로드 후 S3에 `projects/{projectId}/tasks/{taskId}/{uuid}` 키의 객체가 생기는지,
  삭제 후 사라지는지 Console/`aws s3 ls`로 확인.
- Object Key에 원본 파일명이 포함되지 않는지 확인(DB `original_name`에만 저장).
- S3 일시 장애로 DELETE가 ATTACHMENT_STORAGE_ERROR를 반환하면 DB 메타데이터가 남아 있어야 하고(트랜잭션 롤백),
  같은 DELETE 재시도로 성공해야 한다. 객체가 이미 없는 상태의 DELETE도 성공(멱등)을 확인.

## 6. PostgreSQL 메타데이터

```sql
SELECT id, task_id, uploader_id, original_name, storage_key, content_type, size_bytes
FROM task_attachments ORDER BY id DESC LIMIT 5;
```

- Flyway V8 적용 여부: `SELECT version, success FROM flyway_schema_history WHERE version = '8';`
- Hibernate `validate` 모드에서 매핑 오류 없이 기동하는지(POD 로그) 확인.

## 7. 접근 제어 검증

- 프로젝트 비회원이 목록/업로드/다운로드 → 403 (FORBIDDEN)
- 다른 프로젝트의 attachmentId로 요청 → 404 (ATTACHMENT_NOT_FOUND)
- MEMBER가 다른 사람이 올린 파일 삭제 시도 → 403, OWNER는 성공, 업로더 본인 삭제 성공
- 미인증 요청 → 401

## 8. 회귀 검증

- 로그인, 프로젝트/업무 CRUD, 보드 조회 (Phase 3.1 baseline 기능)
- Frontend CloudFront 배포·배포 이력 (Phase 3.2 기능)
- Backend Pod Restart 없이 RollingUpdate 완료, `/actuator/health/readiness` READY
- Helm 기본값(other env) 배포 시 ConfigMap 키 4개 유지(ATTACHMENT\_\* 미노출)

## 9. Rollback

- 애플리케이션: GitOps values에서 `backend.irsa.roleArn`/`backend.attachment.bucket`을
  `""`로 되돌려 sync → storage 기본값(memory)으로 돌아감. S3 객체와 DB 메타데이터는 그대로 남는다.
- Infra: `terraform destroy -target=module.attachment_storage`는 **별도 승인 필요**
  (bucket force_destroy=false라 객체가 남아 있으면 실패한다).

## 10. 알려진 한계 (FUTURE / BACKLOG)

- Task 삭제 시 저장소 파일을 best-effort로 지우고, 실패로 남은 객체는 백그라운드 정리가 없음 — BACKLOG.
  (첨부 DELETE API와 달리 업무 삭제 실패를 막지 않기 위해 무시하고 진행한 뒤 로그만 남긴다.)
- Presigned URL(A3 `/download` 주소)은 local/memory 저장소용 서명 주소로 동작하고,
  s3 저장소에서는 S3 presigned GET을 반환한다. Binary 다운로드 엔드포인트(`/attachments/{id}`)가
  모든 저장소에서 동작하는 기본 경로다.
