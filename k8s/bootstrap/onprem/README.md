# 온프레미스 GitOps 초기 구성

검증일: 2026-10-19

## 버전
- Traefik: Helm chart 41.7.1 / application v3.7.14
- Argo CD: Helm chart 10.10.5 / application v3.5.5

## 구성
- traefik/values.yaml: 실제 적용한 Helm 사용자 설정
- argocd/values.yaml: 실제 적용한 Helm 사용자 설정
- argocd/appproject.json: 앱 리소스 관리 범위
- argocd/application.json: DevFlow 앱 배포 원본과 목적지

## 현재 정책
- Argo CD는 특정 Git 커밋 SHA를 추적한다.
- 앱은 수동으로 동기화한다.
- 자동 동기화와 자동 삭제는 설정하지 않았다.
- 앱 매니페스트 경로는 k8s/overlays/onprem이다.
- 이 bootstrap 디렉터리는 해당 Application의 동기화 대상이 아니다.
- Helm 변경은 운영자가 별도로 실행한다.
- 비밀번호, 토큰, kubeconfig, DB 백업은 포함하지 않는다.

## 검증 완료
- Argo CD: Synced / Healthy
- 앱 Ingress: HTTP 200 OK
- Traefik: Helm revision 4, deployed
- Ingress 상태 주소: 192.168.56.12

## 후속 검증
- Git 변경을 통한 프론트엔드 Pod 교체
- Git 되돌리기 후 이전 설정 복원
- 복원 후 HTTP 응답과 기존 데이터 유지 확인

## 설치 및 설정 복구

저장소 루트에서 실행한다. Kubernetes 관리자 접근 권한이 필요하다.

### Helm 저장소 등록
```bash
helm repo add traefik https://traefik.github.io/charts
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update
```

### Traefik 설치 또는 설정 복구
```bash
helm upgrade --install traefik traefik/traefik \
  --version 41.7.1 \
  --namespace traefik \
  --create-namespace \
  -f k8s/bootstrap/onprem/traefik/values.yaml \
  --wait --timeout 10m
```

### Argo CD 설치 또는 설정 복구
```bash
helm upgrade --install argocd argo/argo-cd \
  --version 10.10.5 \
  --namespace argocd \
  --create-namespace \
  -f k8s/bootstrap/onprem/argocd/values.yaml \
  --wait --timeout 10m
```

### AppProject와 Application 등록
```bash
kubectl apply -f k8s/bootstrap/onprem/argocd/appproject.json
kubectl apply -f k8s/bootstrap/onprem/argocd/application.json
```

Application 등록 후 앱 동기화는 Argo CD에서 수동으로 실행한다.
기존 Application에 적용하면 추적 리비전도 이 파일의 값으로 변경된다.

### 사전 준비
- Kubernetes 클러스터와 CNI가 정상이어야 한다.
- values.yaml에 지정한 노드 이름과 접속 IP가 실제 환경과 일치해야 한다.
- 앱 동기화 전에 devflow 네임스페이스, DB, Redis, PV/PVC와 필요한 Secret을 별도로 준비한다.
- 이 구성만으로 DB 데이터나 인증 정보가 복구되지는 않는다.

### Argo CD 접속
CP SSH 터미널에서 실행하고 유지한다.
```bash
kubectl port-forward -n argocd svc/argocd-server \
  --address 127.0.0.1 8443:443
```

별도 Windows PowerShell에서 SSH 터널을 실행하고 유지한다.
```powershell
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8443:127.0.0.1:8443 devflow@192.168.56.10
```

위 SSH 명령은 PowerShell에서 줄바꿈 없이 한 줄로 실행한다.
브라우저 접속 주소는 https://localhost:8443 이다.

## 롤백 검증 계획
1. 기준 커밋과 frontend Pod UID를 기록한다.
2. frontend Pod template에 검증용 annotation을 추가해 커밋한다.
3. Application의 targetRevision을 검증 커밋 SHA로 변경하고 수동 동기화한다.
4. Pod 교체, Healthy 상태, HTTP 200을 확인한다.
5. 검증 변경을 git revert로 되돌려 새 커밋을 만든다.
6. targetRevision을 되돌리기 커밋 SHA로 변경하고 수동 동기화한다.
7. annotation 제거, Pod 교체, HTTP 응답과 기존 데이터 유지를 확인한다.

이 검증은 Git 설정 변경과 복원을 확인한다.
이미지 버전 롤백과 DB 마이그레이션 되돌리기는 별도 검증 대상이다.

