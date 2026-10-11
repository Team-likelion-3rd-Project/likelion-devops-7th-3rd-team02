# 2차 → 3차 레포 이관 기록

2차 프로젝트 DevFlow의 코드, Git 이력, Wiki를 3차 레포로 옮긴 작업 기록입니다.
무엇을 옮겼고 무엇을 뺐는지, 이관 후 무엇을 바꿔야 하는지를 남깁니다.

| 항목 | 내용 |
|---|---|
| 원본 레포 | `Team-likelion-2nd-Project/likelion-devops-7th-team02` `develop` (`eb62b73`, PR #142까지) |
| 원본 Wiki | `likelion-devops-7th-team02.wiki` `master` (`47c2ff7`, 커밋 52개) |
| 대상 레포 | `Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02` |
| 작업일 | 2026-10-11 |
| 작업자 | 김석현 (리뷰: 이주원) |

## 요약

| 대상 | 결과 | 위치 |
|---|---|---|
| 코드 | ✅ 완료 | PR #8 → `develop` (`858bdad`) |
| 2차 Git 이력 (커밋 50개) | ✅ 보존 | 태그 `archive/2nd-project` (`b77b21c`) |
| Wiki (커밋 52개, 페이지 16개) | ✅ 완료 | Wiki `master` (`79d28dc`) |
| CI (GitHub Actions) | ✅ 통과 | `develop` 기준 Backend Build & Test, Frontend Build, Secret Scan |
| GitLab 연동, CI/CD 변수, K8s Secret | ⏸ 보류 | 3차 CI/CD 도구 결정 후 진행 (5장) |

## 진행 순서

| 시각 (KST) | 내용 |
|---|---|
| 22:24 | 이주원 PR #3 머지 — 3차 frontend 기본 틀 (Vite, TypeScript, Tailwind) |
| 22:30 | 이관 브랜치 `chore/migrate-2nd-project` 작성 완료 (`b77b21c`) |
| 22:38 | 이관 브랜치 push |
| 22:40 | PR #8 생성 후 CI 3종 통과 |
| 22:51 | 이주원 승인 |
| 22:57 | PR #8 머지 (squash) |
| 23:00~23:06 | 태그 `archive/2nd-project` push(2차 이력 보존), Wiki 이관 push |

---

## 1. 이관 방식

3차 레포에 이미 템플릿 커밋, 이슈, PR이 있었기 때문에 mirror push로 덮어쓰지 않았습니다.
2차 `develop`을 remote로 추가하고 `git merge --allow-unrelated-histories`로 병합해 2차 커밋 50개를 이력째 가져왔습니다.

```bash
git remote add second https://github.com/Team-likelion-2nd-Project/likelion-devops-7th-team02.git
git fetch second
git switch -c chore/migrate-2nd-project origin/develop
git merge --allow-unrelated-histories --no-ff second/develop
# 충돌 해결, 제외 대상 삭제 후 커밋
```

이관 브랜치의 커밋 구성:

| 커밋 | 내용 |
|---|---|
| `2172e8c` 병합 커밋 | 2차 이력 병합. 충돌 파일은 3차 템플릿 유지, 제외 대상 삭제 |
| `218cefb` | 2차에서 머지되지 않았던 `docs/backend-readme` 브랜치(Backend README 요약) 반영 |
| `3af0c9c` | CODEOWNERS·LICENSE 빈칸 채움, GitHub Actions Java 17→21, Node 20→22 |
| `b77b21c` | README를 DevFlow 내용으로 작성, 이 문서 추가, 아키텍처 이미지 이름 변경 |

충돌 해결 기준: `README.md`, `CONTRIBUTING.md`, `LICENSE`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/config.yml`, `docs/GUIDE.md`, `docs/images/README.md`, `.gitignore`는 **3차 템플릿**을 따랐습니다.
나머지 `.github/` 파일(이슈 템플릿 01~05, PR 템플릿, `labels.yml`, `workflows/ci.yml`)은 2차와 3차가 같은 내용이었습니다.

### Squash 머지와 이력 보존

PR #8은 squash로 머지되어 `develop`에는 커밋 1개(`858bdad`)로 들어갔고, 2차 커밋 50개는 `develop` 이력에 연결되지 않았습니다.
파일 내용은 이관 브랜치와 같습니다. 원격 이관 브랜치는 머지 후 자동 삭제되었으므로, 2차 이력은 태그로 보존했습니다.

```bash
git log archive/2nd-project            # 2차 커밋 이력 보기
git show eb62b73:파일경로                # 2차 마지막 시점(PR #142)의 파일 보기
```

> 이후 이력을 보존해야 하는 PR은 머지할 때 **Create a merge commit**을 선택합니다.

## 2. 이관 대상과 제외 대상

| 경로 | 처리 | 비고 |
|---|---|---|
| `backend/` | 이관 | `backend/bin/`(IDE 빌드 산출물)만 제외 |
| `k8s/`, `terraform/`, `scripts/`, `monitoring/`, `postman/` | 이관 | 내용 변경 없음 |
| `.gitlab-ci.yml` | 이관 | 내용 변경 없음 |
| `docs/architecture.md`, `docs/kubernetes-*.md`, `docs/frontend/` | 이관 | `docs/frontend/`는 2차 화면 설계 자료로 참고용 |
| `docs/images/2차 아키텍쳐.png` | 이관 | `docs/images/architecture-2nd.png`로 이름 변경 (한글·공백 경로 제거, 내용 동일) |
| `frontend/` | **제외** | 3차는 TypeScript + Tailwind로 새로 작성 (PR #3). 2차 JS 코드는 태그에서 볼 수 있음 |
| `k8s_review_bundle.tar.gz`, `k8s_yaml_review.diff` | **제외** | 리뷰용 임시 산출물 |

2차 frontend 코드를 참고할 때:

```bash
git show eb62b73:frontend/src/pages/ProjectDetailPage.jsx      # 파일 하나 보기
git archive eb62b73 frontend | tar -x -C /tmp/devflow-2nd       # 폴더 통째로 꺼내기
```

`eb62b73`은 태그 `archive/2nd-project`에 포함되어 있으므로 3차 레포만 clone해도 조회할 수 있습니다.

## 3. 비밀값 점검 결과

2차 레포와 Wiki의 전체 이력(모든 브랜치)을 점검했고 **유출된 비밀값은 없습니다.**

- AWS Access Key(`AKIA…`), GitLab/GitHub 토큰, Private Key: 없음
- `.env`, `*.tfstate`, `*.tfvars`, `secret.yaml`, kubeconfig 파일: 커밋된 적 없음 (`*.example`만 존재)
- `backend/docker-compose.yml`, `application-local.yml`의 `devflow-local-password`: 로컬 개발용 기본값
- Wiki의 `--from-literal=admin-password='비밀번호'`: 자리표시자

## 4. 하드코딩 값 (3차 환경에 맞게 확인 필요)

3차에서도 2차 인프라(GitLab 서버, 도메인, EKS 클러스터)를 그대로 쓰면 바꿀 필요가 없습니다. **새로 만들면** 아래를 함께 바꿔야 합니다.

| 파일 | 현재 값 | 변경 기준 | 담당 |
|---|---|---|---|
| `k8s/backend/deployment.yaml:49`, `k8s/frontend/deployment.yaml:49` | `team02-gitlab.manoit.co.kr:5050/root/devflow/...` | 3차 이미지 레지스트리 경로 (GitLab 또는 GHCR) | 최윤재 |
| `k8s/controllers/external-dns/deployment.yaml:48` | `--exclude-domains=team02-gitlab.manoit.co.kr` | 3차 GitLab 도메인 | 김민호 |
| `terraform/environments/dev/main.tf:65`, `variables.tf:36` | `team02-gitlab.manoit.co.kr` | 3차 GitLab 도메인 | 김민호 |
| `terraform/environments/dev/variables.tf:94` | `team02-app.manoit.co.kr` (설명) | 3차 서비스 도메인 | 김민호 |
| `.gitlab-ci.yml:68,80,106,125` | `ap-northeast-1`, `devflow-dev-eks` | 변수(`$AWS_REGION`, `$EKS_CLUSTER_NAME`)로 바꾸기 권장 | 최윤재 |
| `.gitlab-ci.yml` `deploy-dev` 등 `only:` | `feature/devops`, `develop` | 3차 브랜치 전략에 맞게 정리 | 최윤재 |
| `scripts/deploy.sh:4-6` | `devflow`, `devflow-dev-eks`, `ap-northeast-1` | 환경변수 기본값이라 그대로 둬도 됨 | 최윤재 |
| `k8s/*` `namespace:` | `devflow`, `monitoring` | 온프레미스/클라우드 환경 분리 시 결정 | 김민호 |

## 5. git 밖에서 옮기는 항목

- [x] **Wiki**: 2차 Wiki를 이력째 병합 (6장)
- [x] **라벨**: 3차 레포에 `labels.yml`의 22개와 `role/*` 4개(`role/backend`, `role/cloud`, `role/frontend`, `role/onprem`)가 있음. 빠져 있던 `role/*`를 `labels.yml`에 추가해 파일과 실제 라벨을 일치시킴
- [x] **마일스톤**: 3차 일정 M1~M6이 이미 등록되어 있어 2차 마일스톤은 옮기지 않음
- [ ] **GitHub 브랜치 보호 규칙**: PR #8이 CI 통과 후에도 승인 전까지 머지가 막혀 있었으므로 `develop`에 승인 필수 규칙이 있는 것으로 보임. 필수 체크와 허용 머지 방식(merge commit 허용 여부)은 레포 관리자가 확인
- [ ] **CI/CD 변수와 비밀값**: 값은 새로 등록. 3차 CI/CD 도구(GitHub Actions 또는 GitLab)를 정한 뒤 진행
  - AWS 자격 증명: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (aws-cli가 사용)
  - 선택: `AWS_REGION`, `EKS_CLUSTER_NAME`, `RDS_HOST`
  - GitLab을 쓰면 `CI_REGISTRY*`, `CI_COMMIT_SHORT_SHA`는 GitLab이 자동 제공
- [ ] **Kubernetes Secret**: `k8s/backend/secret.example.yaml`, `k8s/registry/image-pull-secret.example.yaml`을 보고 클러스터에 직접 생성 (`JWT_SECRET`, DB 계정 등)
- [ ] **GitLab 프로젝트 연동**: GitLab을 계속 쓰면 미러링 원본 URL을 3차 레포로 변경

## 6. Wiki 이관

코드와 같은 방식으로 2차 Wiki `master`를 3차 Wiki에 `--allow-unrelated-histories`로 병합했습니다. 3차 Wiki는 템플릿 뼈대 12페이지 상태였습니다.

| 커밋 | 내용 |
|---|---|
| `ce403df` 병합 커밋 | 2차 Wiki 커밋 52개 병합 |
| `79d28dc` | 2차 아키텍처 이미지 링크를 3차 레포 경로로 변경 |

| 페이지 | 처리 |
|---|---|
| 2차 페이지 16개 (API 명세서, CI-CD 파이프라인, 인프라 배포 가이드 등) | 내용 그대로 |
| `Home` | 3차 목차 유지, "2차 프로젝트 문서" 목록 추가 |
| `2차-프로젝트-개요` (신규) | 2차 Wiki의 Home 내용을 그대로 보존 |
| `ERD` | 2차 ERD 내용 위에 3차 템플릿의 마이그레이션 표 추가 |
| `트러블슈팅` | 3차 작성 형식 아래에 2차 사례 5건 추가 |
| `시스템-아키텍처` | 이미지 링크를 `docs/images/architecture-2nd.png`로 변경 |
| 3차 템플릿 페이지 (API-Specification, System-Architecture, 배포 가이드, 장애 시나리오, 성능 테스트 등) | 비어 있는 상태 유지. M1 산출물로 새로 작성 |

결과: 커밋 56개, 페이지 26개.

## 7. 팀원 작업 합치는 방법

팀원이 각자 PC에 같은 파일을 따로 옮겨 두었다면, 그대로 push할 때 같은 파일이 이중으로 추가되어 충돌이 납니다.

1. 각자 PC에 옮겨 둔 사본은 버리고 `develop`을 새로 받습니다.
2. 자기 파트에서 **2차와 달라진 내용만** 새 브랜치로 옮겨 PR을 올립니다.

## 8. 이관하면서 발견한 후속 과제

| 항목 | 내용 | 담당 후보 |
|---|---|---|
| Terraform remote state 없음 | `terraform/versions.tf`, `environments/dev/versions.tf`에 `backend` 블록이 없어 state가 로컬에 있음. S3 + DynamoDB lock 필요 | 김민호 |
| JWT Secret 기본값 | `backend/src/main/resources/application.yml`에 `JWT_SECRET`이 없을 때 쓰는 기본값이 공개되어 있고, dev/prod 프로필에서 덮어쓰지 않음. dev/prod는 기본값 없이 필수 값으로 변경 권장 | 김석현 |
| CORS, 정상 종료 설정 없음 | `backend/src/main`에 CORS 설정과 `server.shutdown: graceful`이 없음. 프론트 분리 배포(M2)에 필요 | 김석현 |
| CI 하드코딩 | `.gitlab-ci.yml`의 리전·클러스터 이름을 변수로 바꾸고, 반복되는 kubectl 설치를 공통 템플릿으로 묶기 | 최윤재 |
| `labels.yml`과 실제 라벨 차이 | `role/*` 라벨 4개를 파일에 추가 | ✅ 완료 |
| GitHub Actions 버전 | 템플릿의 Java 17, Node 20을 Java 21, Node 22로 맞춤 | ✅ 완료 (PR #8) |

## 9. 검증

| 항목 | 결과 |
|---|---|
| 2차 파일 누락 검사 | 제외 대상을 뺀 2차 `develop` 파일 158개가 모두 있음. 내용이 다른 파일은 1장의 템플릿 파일, `.github/workflows/ci.yml`, `backend/README.md`(미머지 커밋 반영)뿐 |
| 아키텍처 이미지 | 이름만 바뀌고 내용은 같음 (blob `9629db6`) |
| frontend(#3)와 병합 | 충돌 없음 |
| `./gradlew build` (Java 21) | ✅ GitHub Actions 통과 (PR #8, `develop`) |
| `npm run lint`, `npm run build` (Node 22) | ✅ GitHub Actions 통과 |
| Secret Scan | ✅ 통과 |
| 2차 이력 태그 | `archive/2nd-project` → `b77b21c` 원격 확인 |
| Wiki | 원격 `master` → `79d28dc`, 커밋 56개, 페이지 26개 |
| `terraform validate` / `plan` | ⏸ 코드는 2차와 같음. state 위치 확인 후 김민호 실행 |
| 파이프라인 배포 1회 성공 | ⏸ 3차 CI/CD 도구 결정 후 확인 |
