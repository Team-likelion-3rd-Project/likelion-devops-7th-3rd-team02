# 2차 → 3차 레포 이관 기록

- 원본: `Team-likelion-2nd-Project/likelion-devops-7th-team02` `develop` (`eb62b73`, PR #142까지)
- 대상: `Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02`, 브랜치 `chore/migrate-2nd-project`
- 작성: 2026-10-11, 김석현

## 1. 이관 방식

3차 레포에 이미 템플릿 커밋, 이슈, PR이 있으므로 mirror push로 덮어쓰지 않았습니다.
2차 `develop`을 remote로 추가한 뒤 `git merge --allow-unrelated-histories`로 병합해 **2차 커밋 50개를 그대로 보존**했습니다.

| 커밋 | 내용 |
|---|---|
| 병합 커밋 | 2차 히스토리 병합. 충돌 파일은 3차 템플릿 버전 유지, 제외 대상 삭제 |
| `docs: Backend README 요약 섹션 추가` | 2차에서 머지되지 않았던 `docs/backend-readme` 브랜치(10/7) 반영 |
| `chore: 3차 템플릿 설정을 DevFlow 기준으로 수정` | CODEOWNERS, LICENSE, GitHub Actions의 Java/Node 버전 |
| `docs: README 및 이관 기록 작성` | README를 DevFlow 내용으로 작성, 이 문서 추가 |

충돌 해결 기준: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/config.yml`, `docs/GUIDE.md`, `docs/images/README.md`, `.gitignore`는 **3차 템플릿**을 기준으로 했습니다.
나머지 `.github/` 파일(이슈 템플릿 01~05, PR 템플릿, `labels.yml`, `workflows/ci.yml`)은 2차와 3차가 같은 내용이었습니다.

## 2. 이관 대상과 제외 대상

| 경로 | 처리 | 비고 |
|---|---|---|
| `backend/` | 이관 | `backend/bin/`(IDE 빌드 산출물)만 제외 |
| `k8s/`, `terraform/`, `scripts/`, `monitoring/`, `postman/` | 이관 | 내용 변경 없음 |
| `.gitlab-ci.yml` | 이관 | 내용 변경 없음 |
| `docs/architecture.md`, `docs/kubernetes-*.md`, `docs/frontend/` | 이관 | `docs/frontend/`는 2차 화면 설계 자료로 참고용 |
| `docs/images/2차 아키텍쳐.png` | 이관 | `docs/images/architecture-2nd.png`로 이름 변경 (한글·공백 경로 제거) |
| `frontend/` | **제외** | 3차는 TypeScript + Tailwind로 새로 작성(`chore/#1-frontend-init`). 2차 JS 코드는 이력에서 볼 수 있음 |
| `k8s_review_bundle.tar.gz`, `k8s_yaml_review.diff` | **제외** | 리뷰용 임시 산출물 |

2차 frontend 코드를 참고할 때:

```bash
git show eb62b73:frontend/src/pages/ProjectDetailPage.jsx      # 파일 하나 보기
git archive eb62b73 frontend | tar -x -C /tmp/devflow-2nd       # 폴더 통째로 꺼내기
```

## 3. 비밀값 점검 결과

2차 전체 이력(모든 브랜치)을 점검했고 **유출된 비밀값은 없습니다.**

- AWS Access Key(`AKIA…`), GitLab/GitHub 토큰, Private Key: 없음
- `.env`, `*.tfstate`, `*.tfvars`, `secret.yaml`, kubeconfig 파일: 커밋된 적 없음 (`*.example`만 존재)
- `backend/docker-compose.yml`, `application-local.yml`의 `devflow-local-password`는 로컬 개발용 기본값

## 4. 하드코딩 값 (3차 환경에 맞게 확인 필요)

3차에서도 2차 인프라(GitLab 서버, 도메인, EKS 클러스터)를 그대로 쓰면 바꿀 필요가 없습니다. **새로 만들면** 아래를 함께 바꿔야 합니다.

| 파일 | 현재 값 | 변경 기준 | 담당 |
|---|---|---|---|
| `k8s/backend/deployment.yaml:49`, `k8s/frontend/deployment.yaml:49` | `team02-gitlab.manoit.co.kr:5050/root/devflow/...` | 3차 GitLab 프로젝트 레지스트리 경로 | 최윤재 |
| `k8s/controllers/external-dns/deployment.yaml:48` | `--exclude-domains=team02-gitlab.manoit.co.kr` | 3차 GitLab 도메인 | 김민호 |
| `terraform/environments/dev/main.tf:65`, `variables.tf:36` | `team02-gitlab.manoit.co.kr` | 3차 GitLab 도메인 | 김민호 |
| `terraform/environments/dev/variables.tf:94` | `team02-app.manoit.co.kr` (설명) | 3차 서비스 도메인 | 김민호 |
| `.gitlab-ci.yml:68,80,106,125` | `ap-northeast-1`, `devflow-dev-eks` | 변수(`$AWS_REGION`, `$EKS_CLUSTER_NAME`)로 바꾸기 권장 | 최윤재 |
| `.gitlab-ci.yml` `deploy-dev` 등 `only:` | `feature/devops`, `develop` | 3차 브랜치 전략에 맞게 정리 | 최윤재 |
| `scripts/deploy.sh:4-6` | `devflow`, `devflow-dev-eks`, `ap-northeast-1` | 환경변수 기본값이라 그대로 둬도 됨 | 최윤재 |
| `k8s/*` `namespace:` | `devflow`, `monitoring` | demo/prod 분리 시 결정 | 김민호 |

## 5. git 밖에서 따로 옮겨야 하는 것

- [ ] **Wiki** — 2차 Wiki(API 명세, ERD, 아키텍처, CI/CD, 배포, 트러블슈팅)를 3차 Wiki로 복사. 3차 Wiki에는 템플릿 뼈대 페이지가 있으므로 덮어쓰지 말고 페이지별로 내용을 옮깁니다.
  ```bash
  git clone https://github.com/Team-likelion-2nd-Project/likelion-devops-7th-team02.wiki.git wiki-2nd
  git clone https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02.wiki.git wiki-3rd
  # wiki-2nd의 .md를 wiki-3rd 페이지 이름에 맞춰 복사·병합 → commit → push
  ```
- [ ] **라벨** — `.github/labels.yml`은 2차와 같습니다. 3차 레포에 실제 라벨이 만들어져 있는지 확인합니다.
- [ ] **마일스톤 / Projects 보드** — 3차 주차별로 새로 만듭니다(2차 것은 옮기지 않음).
- [ ] **GitLab CI/CD Variables** — 값은 새로 등록합니다. 이름만 기록합니다.
  - AWS 자격 증명: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (aws-cli가 사용)
  - 선택: `AWS_REGION`, `EKS_CLUSTER_NAME`, `RDS_HOST`
  - `CI_REGISTRY*`, `CI_COMMIT_SHORT_SHA`는 GitLab이 자동으로 제공
- [ ] **Kubernetes Secret** — `k8s/backend/secret.example.yaml`, `k8s/registry/image-pull-secret.example.yaml`을 보고 클러스터에 직접 생성합니다(`JWT_SECRET`, DB 계정 등).
- [ ] **GitLab 프로젝트 연동** — 2차 GitHub 레포를 미러링하던 GitLab 프로젝트의 원본 URL을 3차 레포로 바꾸거나, 3차용 GitLab 프로젝트를 새로 만듭니다.
- [ ] **GitHub 브랜치 보호 규칙** — `main`, `develop` 보호 규칙과 필수 체크(CI) 설정을 확인합니다.

## 6. 팀원 작업 합치는 방법

팀원이 각자 PC에서 같은 파일을 따로 옮겨 두었다면, 그대로 push할 경우 같은 파일이 이중으로 추가되어 충돌이 납니다.

1. 이 이관 PR을 먼저 `develop`에 머지합니다.
2. 각자 `develop`을 새로 받은 뒤, 자기 파트에서 **2차와 달라진 내용만** 새 브랜치로 옮겨 PR을 올립니다.
3. 프론트엔드는 `chore/#1-frontend-init`을 `develop` 기준으로 rebase한 뒤 머지합니다. 이 PR은 `frontend/`를 건드리지 않으므로 충돌하지 않습니다.

## 7. 이관하면서 발견한 후속 과제

| 항목 | 내용 | 담당 후보 |
|---|---|---|
| Terraform remote state 없음 | `terraform/versions.tf`, `environments/dev/versions.tf`에 `backend` 블록이 없어 state가 로컬에 있습니다. S3 + DynamoDB lock으로 옮겨야 팀원 간 state 충돌을 막을 수 있습니다. | 김민호 |
| JWT Secret 기본값 | `backend/src/main/resources/application.yml`에 `JWT_SECRET`이 없을 때 쓰는 기본값이 공개되어 있고, dev/prod 프로필에서 덮어쓰지 않습니다. dev/prod에서는 기본값 없이 필수 값으로 바꾸는 것을 권장합니다. | 김석현 |
| GitHub Actions 버전 | 템플릿의 Java 17, Node 20을 Java 21, Node 22로 맞췄습니다(이 PR에 포함). | 완료 |
| CI 하드코딩 | `.gitlab-ci.yml`의 리전과 클러스터 이름을 변수로 바꾸고, 반복되는 kubectl 설치를 공통 템플릿(`.kubectl_setup`)으로 묶습니다. | 최윤재 |

## 8. 검증

| 항목 | 결과 |
|---|---|
| 2차 파일 누락 검사 | 제외 대상을 뺀 2차 `develop`의 파일 158개가 모두 있음. 내용이 다른 파일은 1장에 적은 템플릿 파일, `.github/workflows/ci.yml`, `backend/README.md`(미머지 커밋 반영)뿐 |
| 아키텍처 이미지 | 이름만 바뀌고 내용은 같음(blob `9629db6`) |
| `./gradlew build` | 백엔드 소스는 2차와 같음. 3차 환경에서 PR CI(GitHub Actions)로 확인 |
| `npm run build` | `frontend/`는 `chore/#1-frontend-init` 머지 후 확인 |
| `terraform validate` / `plan` | 코드는 2차와 같음. state 위치 확인 후 김민호 님이 실행 |
| GitLab 파이프라인 1회 성공 | 3차 GitLab 연동 후 확인 |
