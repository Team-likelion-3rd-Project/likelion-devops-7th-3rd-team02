# 신규 AWS 계정 RDS Multi-AZ 초기 배포 Runbook

대상: MFA 설정이 완료된 **신규 AWS 계정**에 DevFlow 인프라를
최초 배포하고, RDS PostgreSQL을 **최초 생성 시점부터 Multi-AZ DB Instance**로 구성한다.

범위 밖: 기존 계정 RDS의 in-place 전환, State Import, Aurora/RDS Proxy/Read Replica/
Multi-AZ DB Cluster, 기존 계정 DB 데이터 마이그레이션(§F 참조).

관련 코드: `terraform/environments/dev` (`var.db_multiaz` default true → `module.rds`
→ `aws_db_instance.devflow-dev-db` 의 `multi_az`).

---

## A. 신규 AWS 계정 인증 확인

1. MFA 세션 수립 후 identity를 실측한다 (계정 ID를 문서나 기억으로 단정하지 않는다):

   ```bash
   aws sts get-caller-identity
   ```

   여러 profile이 있으면 배포에 쓸 profile을 명시해 확인한다:

   ```bash
   aws sts get-caller-identity --profile <deploy-profile>
   ```

2. **게이트 1 — 승인된 Account ID 일치 확인**: 배포 전 사용자가 승인한 신규
   AWS Account ID를 기록하고(문서·기억으로 단정하거나 임의로 생성하지 않는다),
   `sts get-caller-identity` 출력의 `Account`가 **승인된 값과 일치**해야 통과한다.
   단순히 기존 계정 `834922934330` 과 다르다는 이유만으로 배포를 허용하지 않는다.
   승인 값과 다르면 중단하고 profile/세션을 바로잡는다.
3. **게이트 2 — CLI와 Terraform 동일 계정 확인**: Terraform AWS Provider는
   `providers.tf`에 profile/assume_role이 없어 기본 credential chain
   (env `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_SESSION_TOKEN` 또는
   `AWS_PROFILE`)을 사용한다. plan 출력에 Account ID가 항상 나타나므로
   plan 텍스트만으로 검증하지 않는다. 동일 인증 환경(같은 `AWS_PROFILE`/env)에서
   기존 data source로 실측한다:

   ```bash
   terraform -chdir=terraform/environments/dev console -var-file=terraform.tfvars
   > data.aws_caller_identity.current.account_id
   ```

   이 값이 게이트 1의 승인 Account ID와 `sts get-caller-identity`의 `Account`
   양쪽과 일치해야 한다.
4. MFA 세션 사용 절차: MFA 토큰으로 STS 세션 토큰을 발급해 profile/env에 주입한다.
   Credential/Session Token 값은 이 파일·Git·로그에 기록하지 않는다.
5. **MFA 세션 만료 위험**: 신규 계정 최초 Apply는 VPC→EKS→RDS 생성으로 30분 이상
   소요될 수 있다. 세션 토큰 수명(기본 1시간)보다 Apply가 길면 중간에 실패한다.
   세션 발급 시 duration을 Apply 예상 소요보다 길게 설정하고, Apply 중 만료되면
   새 세션으로 재실행한다(Terraform은 idempotent하게 남은 리소스부터 진행하나,
   중간 상태이므로 plan 재확인이 필요하다).
6. deploy 권한 스모크 (read-only):

   ```bash
   aws iam list-roles --max-items 1
   aws ec2 describe-vpcs --filters Name=is-default-value,Values=true
   aws rds describe-db-instances
   ```

## B. 기존 Terraform 코드 재사용 확인 결과

- 계정 ID 하드코딩: repo 전역 grep 결과 없음. ARN은 `data.aws_caller_identity.current`
  등 동적 생성이므로 코드 그대로 신규 계정에서 재사용 가능.
- IAM Role/Policy: 전부 신규 생성(계정 스코프 이름), 구계정 ARN 참조 없음.
  **구계정의 IAM Role ARN(예: IRSA role, cloud_readonly role)을 신규 계정 값으로
  재사용하지 않는다.** 신규 `terraform output`로 갱신 (§G).
- EKS OIDC Provider: `module.eks` 내부에서 신규 생성(`data.tls_certificate` →
  `aws_iam_openid_connect_provider`). 계정 독립적.
- ACM: Application/ALB-origin cert는 `ap-northeast-1`, CloudFront viewer cert는

  `us-east-1` provider. DNS 검증은 §C의 Route53 zone에 의존. 검증 CNAME은 FQDN당
  **단일 owner 단일 레코드**다: `devflowlab.net`은 `application_acm`만 생성하고
  `frontend_cloudfront_acm`(us-east-1)은 동일 CNAME을 재사용한다(`create_validation_records=false`).
  동일 계정·동일 FQDN의 ACM 검증 CNAME은 리전과 무관하므로 1건으로 두 리전 인증서가
  모두 검증된다. `origin.devflowlab.net` CNAME은 `alb_origin_acm`이 별도로 소유한다.
- Route53: `data.aws_route53_zone.main`이 `var.route53_zone_name`(default `devflowlab.net`,
  zone id `Z0319887F0X04JRXN6SW`) public zone을 **무조건
  조회** → §C D1.
- S3: attachment bucket은 `<project>-<env>-attachment-<account_id>` suffix로
  자동 분리. frontend bucket default `<project>-<env>-frontend`은 전역 이름이라
  §C D4 확인 필요.
- State Backend: backend 블록 없는 **local state**. 신규 계정은 반드시 신규 state
  파일로 시작 (§D).

## C. 초기 배포 선행 조건

### D1 — Route53 Hosted Zone

- `terraform plan`은 `data.aws_route53_zone.main`(`var.route53_zone_name` =
  `devflowlab.net`, public) 조회에

  실패하면 전체가 중단된다. zone은 **Terraform이 만들지 않고 조회만** 하므로
  신규 계정에 Hosted Zone(ID `Z0319887F0X04JRXN6SW`)이 미리 존재해야 한다.
- 확인:

  ```bash
  aws route53 list-hosted-zones-by-name --DNS-name devflowlab.net.
  aws route53 get-hosted-zone --id Z0319887F0X04JRXN6SW   # Nameservers 확인
  ```

- **Zone 생성과 NS 위임 변경을 혼동하지 않는다.** 신규 계정에 zone을 만들고
  실제 트래픽이 이전되려면 도메인의 권한 있는 Nameserver(레지스트라/부모 zone)가
  신규 zone의 NS를 가리켜야 한다. **기존 서비스에 영향을 주는 NS 변경은 별도
  승인 사항**이다. NS 위임이 공개 DNS에 반영돼야 ACM DNS 검증도 완료된다 — zone
  내부에 검증 CNAME을 만들어도 위임 전이면 두 인증서 모두 72시간 후
  `Validation timed out`이 된다.
- DNS 관리 책임 분리: apex `devflowlab.net` A alias(→CloudFront)는 **Terraform
  전용**, `origin.devflowlab.net`(→ALB)와 TXT 소유권 레코드는 **ExternalDNS 전용**
  (Ingress annotation-only + IAM origin 이름 허용). ExternalDNS는 apex를 변경할
  수 없다.
- 도메인(`devflowlab.net`, `origin.devflowlab.net`)을 임의 변경하지 않는다.

### D2 — ExternalId (cloud_readonly_external_id)

- `var.cloud_readonly_external_id`는 default 없는 required 변수다(default를 주면
  느슨한 trust를 방지하기 위한 기존 설계 의도). 값을 못 주면 **최초 plan이
  변수 입력에서 실패**한다.
- ExternalId는 DevFlow 최종 환경 등록(CL2 화면)에서 실제로 사용할 값과
  **동일**해야 한다. 다른 DevFlow 환경(온프레미스·구계정)에서 발급된 값을
  같은 값이라고 가정하지 않는다.
- 이번 Build에서는 ExternalId 조건을 제거하거나 공백으로 우회하지 않는다.
- 사전에 유효한 ExternalId를 확보할 수 없으면, 최초 배포용 **조건부 Read-only
  Role 생성**(module 참조 `count` 게이트)이 필요할 수 있다. 그 경우 함께
  확인·수정해야 할 지점:
  - `terraform/environments/dev/main.tf` 의 `module "cloud_readonly_iam"` (count
    추가 시 `cloud_readonly_role_arn` 등 output 참조가 `module.cloud_readonly_iam[0].*`
    또는 try() 처리 필요)
  - `terraform/environments/dev/outputs.tf` 의 `cloud_readonly_role_arn` /
    `cloud_readonly_role_name`
  - `terraform/modules/cloud-readonly-iam/main.tf` 의 trust policy
    `sts:ExternalId` 조건과 `aws_iam_policy.backend_assume` /
    `aws_iam_role_policy_attachment.backend_assume` 연결
  - `terraform/environments/dev/variables.tf` 의 default 설계
    **별도 승인 없이 코드를 수정하지 않는다.**

### D3 — ACM certificate_arn

- GitLab Legacy 정리로 `var.certificate_arn` root variable은 제거되었다.
  신규 계정 배포에 ACM ARN 입력(tfvars / `TF_VAR_certificate_arn`)은 **불필요**하다.
- DevFlow 서비스용 인증서는 코드가 생성한다(`application_acm`,
  `frontend_cloudfront_acm`, `alb_origin_acm`, DNS 검증 → D1 의존).

### D4 — S3 Bucket 이름

- frontend bucket default `devflow-dev-frontend`는 전역 유일 이름이다. 구계정이
  같은 이름을 보유하면 신규 계정 create가 실패한다:

  ```bash
  aws s3api head-bucket --bucket devflow-dev-frontend   # 403이어도 존재 표시
  ```

- 현재 `terraform/environments/dev`에는 frontend bucket 이름을 override할 root
  variable이나 module wiring이 **없다** (모듈 내부 `s3_bucket_name` 변수로만 존재).
  따라서 이름 충돌이 확인되면 **최초 배포를 중단**하고, 별도 승인 후 Terraform
  변수 연결(root variable + module wiring) 추가를 검토한다. 이번 변경에서 새 변수를
  추가하지 않는다. attachment bucket은 account-id suffix라 충돌하지 않는다.

### D5 — GitLab EC2 AMI

- default `ami-05f4eb3328c0dabc5`가 신규 계정의 `ap-northeast-1`에서 참조
  가능한지 확인:

  ```bash
  aws ec2 describe-images --region ap-northeast-1 --image-ids ami-05f4eb3328c0dabc5
  ```

- public AMI가 아니면 신규 계정에서 공유 설정이 필요하며, 실패 시 blocker로 보고한다.

### D6 — Database

- 신규 `db_password`를 tfvars 또는 `TF_VAR_db_password`로 안전하게 주입한다.
  실제 비밀번호를 Git·Runbook·Terraform 코드에 저장하지 않는다.
- 신규 DB의 스키마는 Backend 첫 기동 시 Flyway가 생성한다 (§F).

## D. 신규 Terraform State 격리

- 신규 계정 배포는 **완전히 새로운 local state**에서 시작한다. 기존 계정의
  `terraform.tfstate`를 복사·Import·재사용하지 않는다.
- State 파일을 미리 만들거나 수정하지 않는다. `terraform init`이 만든 초기
  empty state에서 plan이 전 리소스 create를 보여주는 것이 정상이다.
- **State가 없다고 신규 계정에 AWS 리소스가 없는 것은 아니다.** 최초 Apply 전에
  AWS inventory(read-only describe 목록)와 plan의 create 목록을 대조한다.
- working directory가 `terraform/environments/dev`이고 Backend·Workspace가 local
  default인지 확인:

  ```bash
  terraform -chdir=terraform/environments/dev init
  terraform -chdir=terraform/environments/dev workspace show
  terraform -chdir=terraform/environments/dev state list   # Apply 전: 빈 목록 정상
  ```

## E. Terraform 전체 Plan 게이트

다음 10개 항목을 모두 통과해야 Apply를 검토한다. 하나라도 미충족이면 Apply를
중단한다.

1. `sts get-caller-identity`로 **신규 Account ID 실측 확인** (§A, 구계정 아님)
2. MFA 세션 duration이 Apply 소요보다 크고 deploy 권한 스모크 통과 (§A)
3. D1(Route53 zone)·D3(ACM cert)·D5(AMI) 해결, D2(ExternalId) 값 확보 또는
   §C-D2 조건부 생성 방안 승인 (§C)
4. 신규 계정 state 격리 확인 (§D) — §A 게이트 2의 data source 실측값이 승인된
   신규 Account ID와 일치
5. plan 로그/`terraform console`에서 `var.db_multiaz` 평가값 true 확인:

   ```bash
   terraform -chdir=terraform/environments/dev console -var-file=terraform.tfvars
   > var.db_multiaz
   true
   ```

6. 전체 `terraform plan` 성공 (`-target` 없이):

   ```bash
   terraform -chdir=terraform/environments/dev plan
   ```

7. create 목록이 §B/§6 기대 집합(VPC/Subnet/NAT, SG 4종, GitLab EC2·ALB·DNS,
   EKS+node group+OIDC, LBC/ExternalDNS/GitHub Actions/cloud-readonly IAM,
   ACM 3종, S3 frontend·attachment, CloudFront+OAC, Route53 레코드,
   **RDS Multi-AZ 1개**)과 일치
8. 의도하지 않은 Modify/Replace/Destroy 0 (State가 비어 있어 pre-drift는 plan으로
   탐지 불가 → Apply 후 AWS inventory 대조로 보완)
9. 비용 검토 (§I)
10. **사용자 승인**

- 신규 계정 최초 배포의 전체 create는 정상 결과다. 기존 계정 전환 기준이던
  "update in-place 1건" 기준을 여기엔 적용하지 않는다.
- plan 결과의 `aws_db_instance.rds`가 Multi-AZ로 생성되는지 확인
  (`multi_az = true` 표시).
- `-target` plan만으로 전체 배포가 안전하다고 판단하지 않는다.

## F. RDS Multi-AZ 검증 (Apply 이후)

```bash
aws rds describe-db-instances --db-instance-identifier devflow-dev-db \
  --query "DBInstances[0].{az:AvailabilityZone,maz:MultiAZ,engine:EngineVersion,cls:DBInstanceClass,sg:VpcSecurityGroups,ep:Endpoint.Address,public:PubliclyAccessible,enc:StorageEncrypted,subnet:DBSubnetGroup}"
```

| 항목                      | 기대값                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| DB Identifier             | `devflow-dev-db`                                                                            |
| Engine/Version            | postgres / 15.18                                                                            |
| MultiAZ                   | `true`                                                                                      |
| Primary AZ / Secondary AZ | `ap-northeast-1a`/`ap-northeast-1c` 중 하나 / 나머지 (standby AZ는 events·console에서 확인) |
| DB Subnet Group           | `devflow-dev-db-subnet-group` (private 1a/1c)                                               |
| PubliclyAccessible        | `false`                                                                                     |
| Storage Encryption        | `true`                                                                                      |
| Endpoint                  | 신규 host (GitOps values에 반영, §G)                                                        |

- Backend Pod에서 DB 연결(health/readiness)과 **Flyway 신규 schema 생성**을
  확인한다. `flyway_schema_history`에 V1 baseline부터 **최신 Flyway Migration
  전체(V1~V8)** 가 모두 적용(successful)되어 있어야 하며, 그중
  `V8__create_task_attachments.sql`(첨부파일 테이블) 포함 여부를 명시적으로
  확인한다.
- **기존 계정 DB 데이터는 신규 계정에 자동 이전되지 않는다.** 데이터
  마이그레이션은 이번 Phase 범위 밖이며, Flyway가 스키마만 신규 생성한다.
  마이그레이션을 수행했거나 데이터가 보존된 것처럼 보고하지 않는다.

## G. 기존 워크로드 연결 (신규 Output 반영 순서)

신규 `terraform output` 값을 아래 설정에 순서대로 반영한다. 값은 runbook에
기록하지 않고 각 설정 시스템(GitHub vars, GitOps repo, Secret manager)에만 넣는다.

1. GitHub Actions variable `AWS_DEPLOY_ROLE_ARN` ←
   `terraform -chdir=terraform/environments/dev output -raw github_actions_role_arn`
   (OIDC trust는 동일 repository/env이므로 role ARN만 교체)
2. GitOps per-env values:
   - `backend.config.dbUrl` ← `output rds_endpoint` (신규 host. JDBC URL의
     port·DB 이름 `deflow_db`는 현행 유지)
   - `backend.serviceAccount.roleArn` / `DEVFLOW_AWS_PRINCIPAL_ARN` ←
     `backend_attachments_irsa_role_arn` (두 값은 항상 동일한 Backend IRSA Role ARN)
   - `backend.config.env.ATTACHMENT_S3_BUCKET` ← `attachment_bucket_name`
   - `cloud_readonly_role_arn` 은 DevFlow 프로젝트 클라우드 설정(CL2)에 등록
     (Helm 값 아님, ExternalId는 §C-D2의 그 값)
3. Backend DB Secret: `backend-secret` 의 `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` 를
   신규 계정 값으로 새로 생성 (구계정 Secret 재사용 금지). D6의 비밀번호와 일치해야
   한다.
4. Frontend 배포 경로: CloudFront distribution·S3 bucket은 신규 계정에 새로
   생성되므로 CI의 `FRONTEND_S3_BUCKET`/`CLOUDFRONT_DISTRIBUTION_ID` vars를 신규
   output으로 교체. 도메인(`devflowlab.net`)과 ACM은 §C-D1 위임 상태에
   따라 DNS 반영 확인.
5. OAuth 콜백(도메인 변경 — `FRONTEND_BASE_URL`과 동일 도메인): GitHub OAuth App의
   Callback URL과 Google OAuth의 Authorized redirect URI를 아래 값으로 등록/교체
   (수동·별도 승인).
   - `https://devflowlab.net/login/oauth2/code/github`
   - `https://devflowlab.net/login/oauth2/code/google`
   Backend는 `FRONTEND_BASE_URL + /login/oauth2/code/{github|google}`을 redirect_uri로
   생성하므로 GitOps values(§G2)의 `FRONTEND_BASE_URL`과 정확히 일치해야 한다.
6. Frontend apex DNS alias(takeover/cutover) 최초 배포 순서: apex `devflowlab.net`
   A alias(→CloudFront)의 owner는 Terraform(`aws_route53_record.frontend`)이며
   ExternalDNS는 annotation-only와 Origin 전용 IAM으로 apex를 변경할 수 없다.
   ① `frontend_dns_takeover=false`/`frontend_dns_cutover=false`로 1차 apply
   ② EKS에 LBC/ExternalDNS/ArgoCD 적용 후 Ingress deploy로 ALB 생성 확인
   (LBC 태그 `elbv2.k8s.aws/cluster`+`ingress.k8s.aws/stack` 조회 가능)
   ③ `takeover=true`+`cutover=true`로 2차 apply → alias→CloudFront 신규 생성
   (fresh state이므로 import 불요). Rollback은 `cutover=false` 재apply
   (alias target만 ALB로 atomic 복귀, 레코드 삭제 없음).
7. Observability: monitoring Helm values의 Backend URL과 Alertmanager
   Slack/Email Secret은 신규 cluster에 맞게 재배포. Slack webhook 등 Secret 값은
   기존 것과 동일 재사용 여부 확인 후 Secret store에만 갱신.
8. 이번 Build에서 외부 GitOps repository나 Secret을 직접 수정하지 않는다. 위 항목은
   배포 실행 단계에서 별도 승인으로 수행한다.

## H. Failover 검증 (별도 승인, 자동 실행 금지)

사전: RDS Multi-AZ 정상 생성(§F)과 Backend 정상 연결 확인 완료.

```bash
aws rds reboot-db-instance --db-instance-identifier devflow-dev-db --force-failover
```

- Failover 시작 시각 기록 후 진행 확인:

  ```bash
  aws rds describe-db-instances --db-instance-identifier devflow-dev-db \
    --query "DBInstances[0].DBInstanceStatus"   # failover → available
  aws rds describe-events --source-type db-instance --source-identifier devflow-dev-db
  ```

- 관측 항목:
  - Failover 시작/완료 시각 (AWS 안내상 통상 60~120초, DNS TTL 60초)
  - Backend 연결 중단 시간과 **HikariCP 자동 재연결** (기존 설정 그대로:
    connection-timeout 30s, validation-timeout 5s, maxLifetime 기본 30분.
    코드·설정 변경 없음)
  - Endpoint host명이 failover 전후 **동일**한 것 (standby 승격, DNS 대상만 교체)
  - PostgreSQL 데이터 보존 (failover 전 insert한 marker 행 failover 후 select)
  - Backend API 정상 복구 (health + 대표 조회/쓰기)
- Standby는 읽기 트래픽을 처리하지 않는다. Reader Endpoint·Read Replica는
  사용하지 않는다.
- **실제 명령은 이번 Build에서 실행하지 않는다.**

## I. 비용 및 Rollback

- 신규 계정 전체 비용: EKS control plane + node 2×t3.large, NAT Gateway,
  ALB×2, CloudFront, S3, ACM, EBS, RDS. RDS Multi-AZ는 **db.t3.medium 스탠바이
  복제본 + 스토리지 복제가 추가되어 RDS 비용 약 2배**다.
- 정확한 금액은 AWS Pricing Calculator 또는 Apply 후 Cost Explorer로 확인하고,
  Apply 전 사용자 승인 자료에 포함한다.
- Rollback:
  - Apply 부분 실패 시 **자동 재실행이나 전체 destroy를 하지 않는다.** plan을
    다시 실행해 남은 작업을 확인하고 사용자 승인 후 재Apply한다.
  - **RDS 삭제/재생성을 Rollback 방식으로 제시하지 않는다.**
  - Multi-AZ-only 문제가 확인되면 `db_multiaz=false` 재Apply(별도 승인)가 유일한
    되돌리기다.

## 검증 이력 (this Build)

| 항목                                                                           | 결과                                  |
| ------------------------------------------------------------------------------ | ------------------------------------- |
| `terraform fmt -check -recursive`                                              | PASS                                  |
| `terraform -chdir=terraform/environments/dev validate`                         | PASS                                  |
| `var.db_multiaz` default true / `main.tf`의 `multi_az = var.db_multiaz` wiring | PASS (static)                         |
| `terraform/modules/rds/*`, `environments/dev/main.tf`, `outputs.tf` 무변경     | PASS (git diff)                       |
| 신규 계정 인증 게이트                                                          | NOT RUN — 신규 계정 credential 미확인 |
| 전체 `terraform plan`                                                          | NOT RUN — §E 게이트 미충족            |
| Apply / Failover / Route53 / ACM                                               | NOT RUN (금지)                        |
| Secret 노출 검사 (git diff)                                                    | PASS                                  |
