# AWS Demo Deployment Integration Runbook (Phase 3.1~3.3 보완)

범위: GHCR 이미지 연동 확인, Backend IRSA Role의 `sts:AssumeRole` 확장,
시연용 AWS Read-only Role, Helm/GitOps ARN 연결, Backend Secret/환경변수,
CloudFront Authorization/OAuth Host 설정.
모든 AWS / EKS / Argo CD live 작업은 **운영 승인 후**에만 수행한다.
이 문서만 작성된 단계는 실행하지 않았으며 최종 보고서의 NOT RUN 항목과 대응한다.

## 0. 사전 확인 (read-only)

```bash
aws sts get-caller-identity
kubectl config current-context
```

## 1. Terraform Plan — Apply 필수 게이트 (전체 Plan, -target 사용 금지)

`terraform/environments/dev` 의 tfvars에 **ExternalId 필수 입력**:

```
cloud_readonly_external_id = "<DevFlow 화면(CL2)이 발급한 ExternalId>"
```

- 값은 DevFlow `프로젝트 → 클라우드 연결 → 환경 등록` 시 DB(`project_cloud_environments.aws_external_id`)에
  저장되어 화면에 표시되는 값 그대로다. 임의 생성·재사용 금지.
- 미지정 시 plan이 실패한다. ExternalId 없는 Trust Policy로 대체하지 않는다.
- 이미 다른 프로젝트 환경의 ExternalId로 Role을 만든 경우 재생성하지 않고
  DevFlow에 그 환경을 그대로 등록한다(1 Role = 1 ExternalId; 여러 환경이면 환경별 Role 필요 — FUTURE).

**모든 Apply(타깃 지정 여부와 무관)의 선행 조건은 전체 Plan 성공이다.
`-target`을 붙인 Plan의 결과는 전체 Plan 검증을 대체하지 않는다.**

```bash
terraform -chdir=terraform/environments/dev init -reconfigure
terraform -chdir=terraform/environments/dev plan -out=demo.tfplan
terraform -chdir=terraform/environments/dev show demo.tfplan
```

전체 Plan 통과 조건 (모두 만족해야 Apply 진행):

1. Plan 자체가 **성공**해야 한다. IAM 권한 부족으로 data source 조회가
   `AccessDenied`로 실패하면(plan exit ≠ 0) Apply를 **중단**하고 권한을 가진 운영자가
   Plan한 결과를 검토해야 한다.
   - 현재 로컬 CLI(team02-user03)에서 실측: `route53:ListHostedZones`,
     `cloudfront:ListCachePolicies` AccessDenied로 전체 Plan 실패 → **이 상태로 Apply 금지**.
2. 실제 원격 State가 정상적으로 로드된 Plan이어야 한다. 이미 운영 중인 기존 인프라
   (VPC/EKS/RDS/ALB/Route53 등)가 Plan 출력에 `will be created` 신규 생성으로
   나타난다는 것은 State 불일치 또는 State 미로드 신호이므로 **Apply 중단** 후
   State 경로/import 상태를 먼저 확인한다.
3. 기존 리소스에 의도하지 않은 추가(add)·변경(change)·삭제(destroy)가 없어야 한다.
   의도된 변경은 다음뿐이다:
   - `module.attachment_storage` 신규 리소스(S3·IRSA Role/Policy — 미적용 상태라면)
   - `module.cloud_readonly_iam` 신규 리소스 5개(Role/Policy/Attachment×3)
   - CloudFront distribution의 ALB origin `custom_header`(X-Forwarded-Host) 1건 (update in-place)
4. 위 조건 확인 후 **사용자 승인**을 받아 Apply한다.

Plan 출력에 `destroy` 자원이 1개라도 나오면 즉시 중단하고 보고한다.
기존 인프라를 임의 import/destroy/recreate 하지 않는다.

## 1.1 Terraform Apply (승인 필요 — §1 전체 Plan 게이트 통과 후)

```bash
terraform -chdir=terraform/environments/dev apply demo.tfplan
```

- 전체 Plan에서 승인한 것과 동일한 diff인지 `-show` 출력으로 대조 후 실행한다.
- Apply 중간 실패 시 재시도 전에 Plan을 다시 실행해 상태 대칭성을 확인한다.
- CloudFront ALB origin custom_header(X-Forwarded-Host) 반영도 동일 게이트를 따른다.

| 리소스 | 내용 |
| --- | --- |
| IAM Role `devflow-dev-cloud-readonly-role` | Trust: Principal = Backend IRSA Role ARN, Action `sts:AssumeRole`, Condition `StringEquals sts:ExternalId` |
| IAM Policy `devflow-dev-cloud-readonly-policy` | `rds:Describe*`, `elasticloadbalancing:Describe*`, `cloudwatch:GetMetricData` (세 API 모두 AWS에서 리소스 단위 권한 미지원 → Resource `*`가 최소 허용 형식) |
| IAM Policy `devflow-dev-backend-cloud-assume-policy` | Backend IRSA Role에 `sts:AssumeRole`, Resource = read-only Role ARN 1개로 제한 |

- Backend IRSA Role(`devflow-dev-backend-attachments-role`)의 기존 S3
  `PutObject/GetObject/DeleteObject` 정책과 OIDC Trust(devflow/backend-sa/sts.amazonaws.com)는 그대로 유지된다.
- Backend 코드(`AwsCloudClient`)는 이미 `externalId`를 AssumeRoleRequest에 전달하므로 코드 변경 없다.

## 2. Terraform Output

```bash
terraform -chdir=terraform/environments/dev output -raw backend_attachments_irsa_role_arn   # = DEVFLOW_AWS_PRINCIPAL_ARN = backend.irsa.roleArn
terraform -chdir=terraform/environments/dev output -raw attachment_bucket_name
terraform -chdir=terraform/environments/dev output -raw cloud_readonly_role_arn              # DevFlow 화면 aws_role_arn 필드에 등록
terraform -chdir=terraform/environments/dev output -raw rds_endpoint
```

## 3. GitOps Repository values/aws-dev.yaml 반영 (승인 필요)

`gitops/values/aws-dev.yaml` Seed가 실제 GitOps repo의 기준 키 구조다. 반영할 값:

```yaml
backend:
  config:
    dbUrl: "jdbc:postgresql://<terraform output rds_endpoint>:5432/deflow_db"   # 실제 RDS DB 이름 확인 후 확정
    springProfile: "prod"
    env:
      TZ: "Asia/Seoul"
      K8S_NAMESPACE: "devflow"
      FRONTEND_BASE_URL: "https://devflowlab.net"
      CORS_ALLOWED_ORIGINS: "https://devflowlab.net"
      CACHE_TYPE: "memory"
      DEVFLOW_CLOUD_ALLOW_PRIVATE_NETWORK: "false"
      GITHUB_OAUTH_CLIENT_ID: "<GitHub OAuth App client id>"
      GOOGLE_OAUTH_CLIENT_ID: "<Google OAuth client id>"
      ATTACHMENT_S3_REGION: "ap-northeast-1"
  irsa:
    roleArn: "<output backend_attachments_irsa_role_arn>"     # Principal ARN과 동일 값
  attachment:
    bucket: "<output attachment_bucket_name>"
    storage: "s3"
    maxFileSizeMb: "10"
```

- `DEVFLOW_AWS_PRINCIPAL_ARN`은 values에 직접 넣지 않는다. Chart가
  `backend.irsa.roleArn`에서 ConfigMap으로 자동 주입한다. 두 값은 항상 동일한 Backend IRSA Role ARN이다.
  시연용 read-only Role ARN을 이 값으로 설정하지 않는다.
  (`backend.config.env`에 `DEVFLOW_AWS_PRINCIPAL_ARN`·`ATTACHMENT_S3_BUCKET`·`ATTACHMENT_STORAGE`를
  중복 지정하면 ConfigMap에 같은 키가 두 번 생겨 InvalidConfigError — env 맵에는 넣지 않는다.)
- GitOps repo에서 `backend.serviceAccount.roleArn`을 사용 중이었다면 `backend.irsa.roleArn`으로 교체한다.
  같은 Chart에 두 키를 병존시키지 않는다.
- Argo CD targetRevision/이미지 tag는 `ghcr.io/team-likelion-3rd-project/likelion-devops-7th-3rd-team02/{backend,frontend}`
  의 short8 태그(`<IMAGE_TAG>`)를 그대로 사용한다.

## 4. Kubernetes Secret 생성/갱신 (값은 문서·저장소에 남기지 않음)

Secret 이름 `backend-secret`, namespace `devflow`. Deployment는 `envFrom: secretRef`로 통째로 주입한다.

| Key | 담당 |
| --- | --- |
| `JWT_SECRET` | 팀원 |
| `DEVFLOW_ENCRYPTION_KEY` | 팀원 |
| `GITHUB_OAUTH_CLIENT_SECRET` | 팀원 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | 팀원 |
| `DB_USERNAME` | 사용자 |
| `DB_PASSWORD` | 사용자 (RDS master user; 실제 값 요청·생성 금지) |

```bash
kubectl create secret generic backend-secret -n devflow \
  --from-literal=DB_USERNAME='<RDS_MASTER_USER>' \
  --from-literal=DB_PASSWORD='<RDS_MASTER_PASSWORD>' \
  --from-literal=JWT_SECRET='<openssl rand -base64 48 결과>' \
  --from-literal=DEVFLOW_ENCRYPTION_KEY='<openssl rand -base64 32 결과>' \
  --from-literal=GITHUB_OAUTH_CLIENT_SECRET='<GitHub OAuth App secret>' \
  --from-literal=GOOGLE_OAUTH_CLIENT_SECRET='<Google client secret>' \
  --dry-run=client -o yaml | kubectl apply -f -    # 갱신 동일 (승인 필요)
```

- `DEVFLOW_ENCRYPTION_KEY`를 바꾸면 저장된 Prometheus 토큰 복호가 깨지므로 재입력 필요하다.
- DB 이름은 기존 RDS 실측값를 확인하기 전까지 `deflow_db` 유지 (임의 변경·마이그레이션 금지).

## 5. 배포 후 검증

### IRSA / AssumeRole

```bash
kubectl get sa backend-sa -n devflow -o jsonpath='{.metadata.annotations.eks\.amazonaws\.com/role-arn}'  # Backend IRSA ARN
kubectl get cm backend-config -n devflow -o yaml | Select-String DEVFLOW_AWS_PRINCIPAL_ARN,FRONTEND_BASE_URL,ATTACHMENT
```

- DevFlow 화면에서 프로젝트 환경 등록: `cloud_readonly_role_arn` + 해당 환경 ExternalId,
  RDS 인스턴스 ID / ALB ARN / TargetGroup ARN 입력 → 연결 확인(CL5) 성공 확인.
- Cloud 조회(E4/E5) 화면이 RDS 상태·ALB Target health·CloudWatch 지표를 반환하는지 확인.

### CloudFront Authorization / OAuth

CloudFront API ordered behavior는 `Managed-CachingDisabled` + `Managed-AllViewerExceptHostHeader`로
`Authorization`·Cookie·Query String이 ALB에 전달되고 응답을 공유 캐시하지 않는다(변경 없음).
ALB Origin에 `X-Forwarded-Host = devflowlab.net` custom header가 추가된다(apply 필요).

```bash
curl -fsS -D - -o /dev/null https://devflowlab.net/api/users/me                    # 미인증 → Backend 정책상 401
curl -fsS -H "Authorization: Bearer <JWT>" https://devflowlab.net/api/users/me     # 200
# GitHub OAuth: /oauth2/authorization/github → redirect_uri가 https://devflowlab.net/... 인지 확인
# 로그인 후 프론트 이동·세션 유지·GET /api/users/me 200
```

## 6. Rollback

- GitOps: values에서 `backend.irsa.roleArn`/`backend.attachment.bucket`을 `""`로 되돌려 sync.
- CloudFront: `origin_custom_header` 블록 제거 후 apply (그 외 behavior 무변경).
- IAM: read-only Role/policy removal은 별도 승인 (`terraform destroy -target=module.cloud_readonly_iam` 금지 자동 실행).
- K8s Secret: `kubectl apply` 이전 값으로 재-apply.
