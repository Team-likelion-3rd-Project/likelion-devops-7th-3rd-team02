# GitLab CI/Registry → GitHub Actions + GHCR + GitHub GitOps

상태: **문서·코드 준비 완료 / 실제 실행 대기** — AWS 계정 승인 및 GitHub 등록 전에는 live 변경 단계(4 이후)를 실행하지 않는다.
이 문서의 `kubectl` / `argocd` / `terraform apply` / GitLab 토큰 작업은 AGENTS.md 2 기준 approval-required 이다.

대상 저장소와 산출물:

| 항목                   | 값                                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Application Repository | `https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02` (public, 기본 `develop`)                       |
| GitOps Repository      | `https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02-gitops` (public, 기본 `main`) — seed: `gitops/` |
| Image Registry         | `ghcr.io/team-likelion-3rd-project/likelion-devops-7th-3rd-team02/{backend,frontend}`                                        |
| Image tag              | short SHA 8자리 (GitOps가 참조) + full SHA 40자리 (immutable)                                                                |
| Chart revision         | release commit의 full SHA 40자리 (`applications/devflow.yaml` `targetRevision`)                                              |
| Frontend 정적 파일     | `scripts/deploy-frontend-s3.sh` → S3 + CloudFront Invalidation                                                               |
| AWS 인증               | GitHub Actions OIDC → `devflow-dev-github-actions-role`                                                                      |

`kubectl` 이 필요한 모든 단계는 **EKS private API endpoint 에 도달 가능한 환경**(VPN / bastion / 동일 VPC)에서 실행한다.
GitHub-hosted Runner 는 EKS API 에 접근할 수 없으므로 Workflow 어디서도 `kubectl` / `argocd` mutation 을 수행하지 않는다.

## 1. 기존 경로 목록 (전환 대상)

| 구분              | GitLab                                                                                                                   | GitHub                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Build/Test        | `.gitlab-ci.yml` `frontend-build`, `backend-test`, `backend-build`                                                       | `.github/workflows/ci.yml` (재사용)                      |
| Image build/push  | `frontend-image`, `backend-image` → `$CI_REGISTRY_IMAGE`                                                                 | `.github/workflows/container-images.yml` (재사용) → GHCR |
| Backend 배포      | `deploy-gitops-dev` → `scripts/update-gitops-release.sh`                                                                 | `.github/workflows/release-dev.yml`                      |
| Backend 롤백      | `rollback-gitops-dev` → `scripts/rollback-gitops-release.sh`                                                             | `.github/workflows/rollback-dev.yml`                     |
| 검증              | `verify-gitops-dev` (kubectl)                                                                                            | runbook 6 (kubectl) — Runner 실행 불가                   |
| Frontend S3       | `frontend-deploy-dev` → `scripts/deploy-frontend-s3.sh`                                                                  | `.github/workflows/deploy-frontend.yml`                  |
| kubectl 직접 배포 | `deploy-dev`, `health-check-dev`, `rollback-dev` (`scripts/deploy.sh`, `scripts/rollback.sh`, `scripts/health-check.sh`) | 이관하지 않음                                            |

## 2. 사전 준비 (배포 영향 없음)

1. GHCR 패키지 4종 확인/생성: `backend`, `frontend` 는 workflow 첫 push 시 자동 생성된다. **Visibility 를 Public 으로 설정** (EKS kubelet 이 인증 없이 pull).
   기존 `…-backend` / `…-frontend` 이름의 구 패키지명은 소비자가 없으므로 새 이름으로 전환 후 정리한다.
2. GitHub 환경 설정:
   - Environment `dev` 생성 → required reviewers 등록 (이 environment 가 `when: manual` 승인을 대체한다).
   - Secret `GITOPS_TOKEN` 등록 (GitOps 저장소 단독, `contents: Write`). 기본 `GITHUB_TOKEN` 은 타 저장소에 쓰기 권한이 없다.
   - Variables: `GITOPS_REPO_URL`, `GITOPS_BRANCH`, `FRONTEND_S3_BUCKET`, `CLOUDFRONT_DISTRIBUTION_ID`, `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`.
3. GitHub GitOps Repository 생성 후 `gitops/` 내용을 그대로 첫 커밋 (`applications/`, `bootstrap/`, `values/`, `README.md`).
4. `values/aws-dev.yaml` 의 `<RDS_HOST>` 를 `terraform -chdir=terraform/environments/dev output -raw rds_endpoint` 값으로 교체.
   `tag: "<IMAGE_TAG>"` 와 `targetRevision: "0000…"` 는 **그대로 둔다** — 첫 release commit 이 교체한다 (5-C).
   placeholder 가 남은 상태에서는 어느 Case 에서도 first sync 를 수행하지 않는다.
5. Terraform: `terraform plan` 검토 후 `terraform apply` (OIDC provider 1, role 1, role policy 1). `github_actions_role_arn` 을 `AWS_DEPLOY_ROLE_ARN` 에 등록.
6. `Release Dev` / `Rollback Dev` / `Deploy Frontend` workflow 는 dispatch 전용이므로 이 단계에서 자동 실행되지 않는다.

## 3. 현재 운영 상태 판별 (Cutover 방식 결정)

Argo CD 가 실제로 EKS 에 설치되고 GitLab GitOps 저장소를 watch 중인지 먼저 확인한다.

```bash
kubectl -n argocd get application -o wide
kubectl -n argocd get application devflow -o json | jq '.spec.sources, .spec.project, .spec.syncPolicy, .spec.ignoreDifferences'
```

| Case                              | 조건                                                    | 절차                |
| --------------------------------- | ------------------------------------------------------- | ------------------- |
| A. 기존 GitOps 운영 중            | `application/devflow` 이 존재하고 sources 가 GitLab URL | 4 → 5 (repoint)     |
| B. GitOps 미설치 (최초 bootstrap) | argocd namespace 또는 Application 이 없음               | 4 → 5-B (최초 적용) |

Case A 에서 5-A 적용 전 live desired state 를 백업해 둔다 (필요시 Case A 롤백 지점).

```bash
kubectl -n argocd get application devflow -o yaml > backup-application-devflow.yaml
kubectl -n argocd get application -o yaml > backup-applications.yaml
```

## 4. T0 — GitLab 배포 동결 (repoint 이전, 필수)

Argo CD 저장소 주소만 바꾸면 GitLab Job 은 여전히 실행 가능하므로 **자격증명 회수로 차단**한다.

1. GitLab → Project → Access Tokens 에서 `GITOPS_TOKEN` (GitOps 저장소용 token) **revoke**.
   → revoke 후 `deploy-gitops-dev` / `rollback-gitops-dev` 는 트리거되어도 clone/push 가 실패한다.
2. GitLab pipeline 을 pause 하거나 runner 를 unregister 하여 수동 job 실행 자체를 막는다.
3. kubectl 직접 배포 job(`deploy-dev`, `health-check-dev`, `rollback-dev`) 도 이 시점에 **실행 금지**로 명시한다.
   GitLab Project Access Token / kubeconfig 갱신 경로(`aws eks update-kubeconfig`)를 쓰는 job 이 남지 않도록 확인한다.
4. 동결 근거 스냅샷을 저장한다:

```bash
# T0 이후 GitLab GitOps 저장소에 release commit 이 추가되지 않음을 확인
git -C <gitlab-gitops-clone> log --oneline --since="<T0>" --grep='^release:' | tee freeze-evidence-gitops.log
```

Gate: T0 이후 GitLab GitOps repo 의 `release:` commit 0건, GitLab pipeline 실행 0건.

## 5. Argo CD 저장소 연결 전환

### 5-A. Case A (기존 GitOps 운영 중)

Phase A 는 Root/Child 모두 auto-sync OFF 유지. Root auto-sync OFF 상태에서는 release commit 의 `applications/devflow.yaml` 변경이 Child 에 자동 반영되지 않으므로, Phase A 의 모든 전파는 Root 수동 sync → Child 수동 sync 순서로 수행한다. auto-sync OFF 이므로 repoint 자체는 Pod 를 움직이지 않는다.

1. **repo 전환 전에 5-C initial release commit gate 완료** — GitHub GitOps 저장소 HEAD 에 실제 Chart SHA / Image Tag 를 담은 release commit 이 존재해야 한다.
2. Root Application 재point: `bootstrap/root.yaml` 기준으로 Root Application 의 `source.repoURL` 을 GitHub GitOps 저장소 (`path: applications`) 로 변경.
   Child Application 만 직접 patch 하면 Root(GitLab 잔존)가 곧 되돌리므로 **Root 를 먼저** 전환한다.
3. Root 수동 sync 1회 → 실제 값이 담긴 `applications/devflow.yaml` 이 적용되어 Child 의 chart/values source 가 GitHub 로 바뀐다:

```bash
argocd app sync devflow-root
kubectl -n argocd get application devflow -o json | jq '.spec.sources'
```

4. Child diff 및 adoption 검증 (§6.1~§6.3):

```bash
argocd app diff devflow || true
```

   기대: registry / repoURL 관련 diff 만 보이고 무관한 diff 는 없다. Child 가 여전히 placeholder 를 가리키면 5-C gate 로 되돌아가 release commit 을 먼저 완성하고, placeholder 상태 Child 의 diff/sync 는 성공 검증으로 처리하지 않는다.
5. Child 수동 first sync 1회:

```bash
argocd app sync devflow
kubectl -n argocd wait --for=condition=ManagedByArgoCD apps/application/devflow --timeout=180s || true
kubectl -n devflow rollout status deployment/backend --timeout=300s
kubectl -n devflow rollout status deployment/frontend --timeout=300s
```

6. 검증: §6 전체 + §7 (Phase A release / rollback 왕복 — Root → Child 순서).
7. 검증 완료 시 §8 auto-sync 전환.

### 5-B. Case B (GitOps 미설치 — 최초 Bootstrap)

1. `values/aws-dev.yaml` 의 `<RDS_HOST>` 를 §2.4 기준으로 완성한다. `tag`/`targetRevision` placeholder 는 그대로 둔다.
2. **Argo CD 적용 전에 5-C initial release commit gate 완료** — placeholder 를 실제 값으로 교체한 release commit 을 GitHub GitOps 저장소에 먼저 만든다.
3. Argo CD 설치 (Phase 3.1 유지 구성) 후 `bootstrap/root.yaml` 수동 적용 — Root auto-sync OFF 이므로 이 시점에는 Child Application 이 생성되지 않는다:

```bash
kubectl apply -f gitops/bootstrap/root.yaml
kubectl -n argocd get application devflow-root -o wide
```

4. Root 수동 sync 1회 → Root 가 `applications/devflow.yaml` 을 렌더하여 Child Application 생성:

```bash
argocd app sync devflow-root
kubectl -n argocd get application devflow -o wide
kubectl -n argocd get application devflow -o json | jq '.spec.sources[] | select(.path=="helm/devflow") | .targetRevision'
```

5. Child Application 생성 확인 (존재 + `targetRevision` 이 release commit full SHA, placeholder 아님) 후 Child 수동 first sync (§5-A 5 단계와 동일), 이후 §6~§8. Child 가 없으면 Root sync 를, placeholder 이면 5-C gate 를 다시 확인한다.

### 5-C. Initial Release Commit Gate (Case A/B 공통 — First Sync 필수 전제)

First Sync 는 GitOps repository HEAD 의 `tag`/`targetRevision` 이 **실제 값**일 때만 허용한다.
아래 4 단계를 순서대로 완료한다.

1. GHCR 이미지 준비 확인 — 첫 release 대상 app commit 의 `Container Images` workflow 가 성공했는지, 이미지가 실재하는지 확인:

```bash
docker buildx imagetools inspect ghcr.io/team-likelion-3rd-project/likelion-devops-7th-3rd-team02/backend:<short8>
docker buildx imagetools inspect ghcr.io/team-likelion-3rd-project/likelion-devops-7th-3rd-team02/frontend:<short8>
```

2. 실제 app commit SHA (full 40) 확인 — CI·Container Images 가 모두 성공한 commit 이어야 한다 (`Release Dev` preflight 도 이를 검증한다):

```bash
git -C <app-repo-clone> log --format='%H %ci' -5 origin/develop
```

3. GitHub Actions `Release Dev` dispatch (release_sha = 2 단계 SHA) → Environment `dev` 승인 → GitOps release commit 생성.
4. GitOps repository 실제 값 확인 (placeholder 잔존 여부 gate):

```bash
git -C <gitops-clone> pull --ff-only origin main
git -C <gitops-clone> log -1 --format='%s' main          # 기대: release: dev image <short8> chart <full40>
grep -n 'tag: "<short8>"' <gitops-clone>/values/aws-dev.yaml
grep -n 'targetRevision: "<full40>"' <gitops-clone>/applications/devflow.yaml
```

`update-gitops-release.sh` 는 placeholder 가 남으면 오류로 종료하므로 placeholder 가 섞인 release commit 은 생성되지 않는다.
Gate 통과 기준: GitOps HEAD 의 두 파일에서 `<IMAGE_TAG>`, `0000…` placeholder 가 사라지고 위 grep 이 실제 값과 일치한다.
placeholder 가 남은 Child Application 에 대한 diff 나 first sync 는 성공 검증으로 처리하지 않는다 (무효한 image reference 대조).

## 6. 검증 목록

| #   | 항목                   | 명령 확인 및 검증 기준                                                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Desired State Identity | `sh scripts/check-gitops-adoption.sh gitops/values/aws-dev.yaml` → 10 resources                                                |
| 2   | Chart Revision         | `jq '.spec.sources[] \| select(.path=="helm/devflow") \| .targetRevision'` → release commit full SHA                           |
| 3   | Ref Source             | Values source에 `ref: values` 존재, `path` key 없음                                                                            |
| 4   | Running Image          | `kubectl -n devflow get deploy backend -o jsonpath='{.spec.template.spec.containers[0].image}'` → `ghcr.io/…/backend:<short8>` |
| 5   | Image Pull             | `kubectl -n devflow get events --field-selector reason=Pulling` → Pull 정상 및 `imagePullSecrets` 미사용 확인                  |
| 6   | HPA                    | `kubectl -n devflow get hpa backend-hpa` → min 2, max 4, CPU 목표 70%                                                          |
| 7   | Replicas 보존          | HPA가 replicas를 2 초과로 확장한 뒤 Argo CD Sync → Live replicas 유지 (`ignoreDifferences: /spec/replicas`)                    |
| 8   | Sync / Idempotency     | `sh scripts/verify-gitops-dev.sh` → `EXPECTED_IMAGE_TAG`, `EXPECTED_CHART_SHA` 검증                                            |
| 9   | 회귀 테스트            | ALB Ingress, ExternalDNS, CloudFront → ALB Origin 동작 확인                                                                    |

## 7. Phase A — GitHub Actions 배포 / 롤백 검증 (Root → Child 수동 전파)

Phase A(Root/Child auto-sync OFF)에서는 release/revert commit 이 클러스터에 자동 반영되지 않는다. 모든 commit 은 아래 Root → Child 순서로 수동 전파·검증한다.

1. 첫 release commit 은 5-C 에서 이미 생성·확인했다. 여기서 다른 (이후의) app commit 으로 `Release Dev` 를 재-dispatch → preflight: CI·Container Images 성공 이력과 GHCR 이미지 존재 확인 → Environment `dev` 승인 → release commit 갱신.
2. GitOps 저장소에 `release: dev image <short8> chart <full40>` 커밋 1건, 수정 파일 2건 확인.
3. **Root 수동 sync** → `applications/devflow.yaml` 의 chart revision 변경을 Child 에 전파:

```bash
argocd app sync devflow-root
```

4. **Child targetRevision 확인** — release commit full SHA 와 일치해야 한다:

```bash
kubectl -n argocd get application devflow -o json | jq -r '.spec.sources[] | select(.path=="helm/devflow") | .targetRevision'
```

5. **Child 수동 sync** 후 Deployment image tag / chart SHA 확인 (§6.2, §6.4):

```bash
argocd app sync devflow
sh scripts/verify-gitops-dev.sh   # EXPECTED_IMAGE_TAG / EXPECTED_CHART_SHA
```

6. `Rollback Dev` dispatch → 직전 release commit 지정 → revert commit 1건 → **동일한 Root → Child 순서(3~5 단계)** 로 이전 Chart SHA / Image Tag 복원 확인. Git-only rollback 방식 유지 (revert commit → Argo CD 전파, `kubectl rollout undo` 없음).
7. 비-release 커밋(seed/`chore:` 커밋) 을 지정하면 스크립트가 거부하는지 확인 (`refusing to revert non-release commit`).

## 8. Phase B — Auto Sync 최종 전환 (검증 완료 후, AWS 승인 이후에만 적용)

최종 운영 형태는 Root/Child 모두 auto-sync ON. Root auto-sync OFF 가 release commit 전파의 병목이므로 Child 만 ON 으로 남겨서는 release commit 이 자동 반영되지 않는다.

1. **Child**: `applications/devflow.yaml` 의 `syncPolicy` 에 `automated.selfHeal: true` 를 추가한 커밋을 만들고 (subject 는 `release:` 로 시작하지 않게) Root 수동 sync 로 전파한다.

```yaml
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
      - ServerSideApply=true
```

2. **Root**: `bootstrap/root.yaml` (Root Application 정의는 이 파일 단독) 의 `syncPolicy` 에 `automated` 를 추가한 뒤 `kubectl apply` 로 수동 적용한다. `bootstrap/` 경로는 Root 의 watch 경로(`applications/`) 밖에 있으므로 Root 자신의 auto-sync 설정은 Git auto-sync 로 반영되지 않으며, 항상 이 파일 수정 + 수동 apply 절차다.

```bash
kubectl apply -f gitops/bootstrap/root.yaml
kubectl -n argocd get application devflow-root -o jsonpath='{.spec.syncPolicy}'
```

   Root Phase B syncPolicy (기존 syncOptions 유지, auto-sync ON):

```yaml
  syncPolicy:
    automated: {}
    syncOptions:
      - RespectIgnoreDifferences=true
      - ServerSideApply=true
```

3. 반영 확인: 새 release commit dispatch 없이 Root auto-sync 가 `applications/` 변경을 Child 에 전파하는지, 이어서 Child auto-sync 가 chart/image 를 동기화하는지 관찰.

전제: `ignoreDifferences` 의 `apps/Deployment/backend /spec/replicas` 가 이미 적용되어 있어야 한다.
이 설정 없이 Child selfHeal 을 켜면 Argo CD 가 HPA 가 올린 replicas 를 chart 값(2) 으로 되돌린다.

전환 후 배포 경로는 다음 뿐이다.

```text
GitHub Actions → GitHub GitOps release commit → Root auto-sync (applications/ → Child) → Child auto-sync → EKS
```

## 9. Rollback

| 상황                     | 절차                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 특정 release 문제        | `Rollback Dev` dispatch (Git-only revert)                                                                                                                                    |
| GitHub Actions 자체 문제 | workflow 파일 revert PR + GitLab pipeline resume (token revoke 취소)                                                                                                         |
| Argo CD 연결 원점 회귀   | 백업해 둔 Application manifest 재適用 (`kubectl apply -f backup-application-devflow.yaml`) — Case A 한정                                                                     |
| GHCR pull 불가           | `values/aws-dev.yaml` 의 `image.repository` 를 GitLab registry 경로로 되돌리고 `global.imagePullSecretName: gitlab-registry-secret` 지정 (수동 커밋, Argo CD sync 로만 반영) |
| Frontend 정적 파일       | 이전 build artifact 로 `deploy-frontend-s3.sh` 재실행 또는 S3 versioning restore                                                                                             |
| DNS/CloudFront           | 본 전환 범위 밖 — rollback 사용                                                                                                                                              |

## 10. 트러블슈팅

| 증상                                                           | 원인 / 조치                                                                                                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHCR push `400` / pull `unauthorized`                          | owner 대문자 잔존. 이미지 reference 는 전부 소문자여야 한다 (`ghcr.io/team-likelion-3rd-project/…`). workflow 는 `${GITHUB_REPOSITORY,,}` / `tr 'A-Z' 'a-z'` 사용 |
| `ImagePullBackOff`                                             | 패키지 visibility 가 private. Public 전환 또는 `global.imagePullSecretName` 에 dockerconfigjson Secret 지정 (`k8s/registry/image-pull-secret.example.yaml`)       |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity`      | trust policy `sub` claim 의 owner/repo 대소문자 또는 environment 이름 불일치. workflow 로그의 claim 실제 값으로 `var.github_repository` 교정                      |
| OIDC provider 생성 후 assume 실패 (thumbprint)                 | `data.tls_certificate` 가 반환한 leaf 지문 사용. 실패 시 AWS 가 안내하는 GitHub OIDC 루트 CA 지문으로 교체                                                        |
| release script 가 `WARNING: … <IMAGE_TAG> placeholder` 후 종료 | GitOps values 가 인증 레지스트리 기반 seed 라는 뜻. release commit 을 만들지 않고 기존 배포 경로를 그대로 유지한다 (정상 동작)                                    |
| release script 가 `chart targetRevision … 0000…` 오류          | 첫 release commit 전 상태. dispatch 로 full SHA 를 반영하면 해소된다                                                                                              |
| revert 가 거부됨                                               | 대상이 `release:` 커밋이 아니거나 `values/aws-dev.yaml` / `applications/devflow.yaml` 외 파일을 건드린 커밋                                                       |

## 11. 전환 완료 후 제거 (별도 승인, 이 문서에서 수행하지 않음)

`.gitlab-ci.yml`, `scripts/deploy.sh`, `scripts/rollback.sh`, `scripts/health-check.sh`,
`k8s/rbac/gitlab-deployer-*.yaml`, `k8s/registry/image-pull-secret.example.yaml`,
terraform `module.gitlab` / `module.gitlab-alb` / `aws_iam_role_policy.gitlab_*` / `aws_eks_access_entry.gitlab_runner`
(terraform 자원 removal 은 state 정리와 별도로 승인한다).

## 12. 실행 기록 (실행 후 채울 것)

| Step                  | 일시 | 실행자 | 결과 |
| --------------------- | ---- | ------ | ---- |
| 2 사전 준비           |      |        |      |
| 4 T0 동결             |      |        |      |
| 5 repoint / bootstrap |      |        |      |
| 6 검증                |      |        |      |
| 7 Actions 배포·롤백   |      |        |      |
| 8 auto-sync           |      |        |      |
