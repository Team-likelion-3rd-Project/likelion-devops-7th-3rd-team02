# devflow-gitops — Argo CD desired state (Phase 3.1 / 3.2)

GitHub Actions가 갱신하는 Argo CD desired state 저장소입니다. 이 디렉터리는 그 저장소의
목표 레이아웃을 그대로 담고 있는 seed이며, 내용을 그대로 새 GitHub GitOps Repository에
복사해 사용합니다 (저장소 생성과 첫 push는 사용자가 수행합니다).

## Layout

```text
devflow-gitops/
├── applications/
│   └── devflow.yaml      # Child Application (multi-source Helm) — CI가 chart revision 갱신
├── bootstrap/
│   └── root.yaml         # Root Application 단독 정의 — kubectl로 1회 수동 적용
├── values/
│   └── aws-dev.yaml      # Helm values 전용 — CI가 image tag 갱신
└── README.md
```

Root Application은 `applications/` 경로만 관리하므로 `bootstrap/root.yaml`을 스스로
렌더링하지 않습니다(자기참조 없음). Root Application 정의는 이 파일 하나만 존재해야 합니다.

## CI가 갱신하는 것 (GitOps Release Commit)

`scripts/update-gitops-release.sh`가 커밋 하나로 다음 두 파일만 변경합니다.

| 파일 | 변경 내용 |
|---|---|
| `values/aws-dev.yaml` | `tag: "<IMAGE_TAG>"` → release commit의 short SHA 8자리 |
| `applications/devflow.yaml` | `targetRevision: "<40 hex>"` → release commit의 full SHA |

Rollback은 `scripts/rollback-gitops-release.sh`가 `release:` 커밋만 revert합니다.
`bootstrap/` 이하와 이 README는 release commit 대상이 아닙니다.

## 첫 적용 전에 채워야 할 값

| 위치 | 값 |
|---|---|
| `applications/devflow.yaml` `targetRevision` | `0000...` 유지 — 첫 `Release Dev` 실행이 실제 SHA로 교체합니다 |
| `values/aws-dev.yaml` `tag` | `<IMAGE_TAG>` 유지 — 첫 `Release Dev` 실행이 실제 short SHA로 교체합니다 |
| `values/aws-dev.yaml` `dbUrl` | `terraform -chdir=terraform/environments/dev output -raw rds_endpoint` 값으로 교체 |

auto-sync가 꺼져 있는 동안에는 위 placeholder가 남아 있어도 Pod에 아무 영향이 없고,
`update-gitops-release.sh`는 placeholder가 남은 채 커밋하지 않습니다. 단, placeholder가
실제 값으로 교체된 release commit이 만들어진 뒤에야 첫 Argo CD sync를 수행합니다
(Cutover Runbook §5-C 게이트).

## Multi-source 구조

- chart source: GitHub Application Repository, `path: helm/devflow`, `targetRevision: <immutable full SHA>`
- values source: GitHub GitOps Repository, `targetRevision: main`, `ref: values`, `path` 없음
- values 주입: chart source의 `helm.valueFiles: [$values/values/aws-dev.yaml]`

`ref: values` source는 values 주입 전용이며 Kubernetes 리소스를 생성하지 않습니다.

## Bootstrap (수동)

적용 대상과 실행 위치:

| 항목 | 값 |
|---|---|
| 대상 cluster | EKS `devflow-dev-eks` (dev) — Argo CD 는 이 cluster 의 `argocd` namespace 에 설치되어 있습니다 |
| kubeconfig | `aws eks update-kubeconfig --region ap-northeast-1 --name devflow-dev-eks` |
| 실행 위치 | EKS API endpoint 가 private 전용이므로 VPC 안에서 도달 가능한 환경 (VPN / bastion) 에서 실행 |
| 적용 단위 | `bootstrap/root.yaml` → `argocd` namespace 의 `application/devflow-root` |

`kubectl apply` 는 live 변경이므로 승인 후 실행합니다.

```bash
kubectl config current-context
kubectl -n argocd get namespace argocd
kubectl apply -f bootstrap/root.yaml
kubectl -n argocd get application devflow-root -o wide
argocd app sync devflow-root
kubectl -n argocd get application devflow -o wide
```

Root auto-sync가 OFF인 Phase A에서는 `bootstrap/root.yaml` 적용만으로는 Child Application이
생성되지 않습니다. Root를 한 번 수동 sync해야 Root가 `applications/`를 렌더하여 Child를 만듭니다.
`applications/devflow.yaml` 은 Root Application 이 렌더링하므로 직접 apply 하지 않습니다.
직접 apply 하면 Root Application 과 소유권이 중복됩니다.
Kubernetes Bootstrap 자동화는 Phase 3.8.5 범위이며 여기서는 수동 절차입니다.

## Auto Sync

Root Application은 `applications/`를 관리하므로 release commit이 `applications/devflow.yaml`의
chart SHA를 바꾸면 **Root가 Child 스펙에 전파**해야 Child가 새 chart/image를 반영합니다. Root
auto-sync가 OFF면 이 전파가 수동이 된다.

| 단계 | Root Application (`bootstrap/root.yaml`) | Child Application (`applications/devflow.yaml`) |
|---|---|---|
| Phase A: bootstrap·adoption·배포/롤백 검증까지 | `automated` 없음 (auto-sync OFF), Root→Child 전파는 수동 sync | `automated` 없음 (auto-sync OFF), sync는 수동 |
| Phase B: 검증 완료 후 | `automated: {}` 추가 (auto-sync ON), `kubectl apply` 수동 적용 | `syncPolicy.automated.selfHeal: true` 추가 (auto-sync ON, selfHeal ON) |

Root 정의는 `bootstrap/root.yaml` 단독이고, 이 경로는 Root의 watch 경로(`applications/`) 밖에
있으므로 Root auto-sync ON 전환은 GitOps auto-sync로 반영되지 않고 항상 `kubectl apply` 수동
적용입니다 (Runbook §8). Child는 `applications/` 안에 있으므로 Git 커밋 + Root sync로 전파됩니다.

`ignoreDifferences`의 `apps/Deployment/backend /spec/replicas`는 Child selfHeal ON 이전에
반드시 적용되어 있어야 합니다. HPA가 소유한 replicas를 Argo CD가 되돌리지 않도록
HPA(minReplicas 2, maxReplicas 4, CPU 70%)는 Helm Chart가 관리합니다.

## Registry

이미지는 GHCR public package를 사용하므로 `imagePullSecretName`은 빈 값이고,
Deployment에 `imagePullSecrets`가 렌더되지 않습니다. 인증 레지스트리로 되돌리려면
`global.imagePullSecretName`에 dockerconfigjson Secret 이름을 지정합니다.

Cutover 순서와 검증 목록은 `../docs/migration/gitlab-to-github-actions.md`를 참고합니다.
