# 온프레미스 앱 배포 구성

이 경로는 현재 온프레미스에서 검증한 앱의 독립 Kustomize 진입점이다. 기존 k8s/backend, k8s/frontend 및 AWS ALB 구성은 참조하거나 수정하지 않는다.

## 범위와 사전 조건

관리 대상은 frontend/backend Deployment·Service 및 devflow Ingress, 총 5개다. devflow Namespace, Traefik, PostgreSQL·Redis, PV/PVC는 기존 인프라로 준비돼 있어야 한다. 이 경로에는 데이터 볼륨과 Secret의 정의를 넣지 않았다. 추후 Argo CD 연결 시 데이터 인프라의 생명주기·삭제 정책은 별도로 결정한다.

필요한 devflow Namespace의 Secret:
- ghcr-pull-secret: kubernetes.io/dockerconfigjson 형식의 GHCR 읽기 인증
- backend-secret: DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET
- redis-secret: REDISCLI_AUTH 키를 백엔드 REDIS_PASSWORD에 연결

비밀 값·환경변수 파일·DB 덤프·kubeconfig를 이 경로에 추가하지 않는다. DB_URL은 현재 검증 구성에서 backend-secret에 함께 저장돼 있다.

## 실행 기준

소스 커밋 87b04f86f465ea949fda5fa5e06b77275ff570a2의 이미지를 검증했다. 이미지 tag는 원본 YAML에 기록하고, 실제 Kustomize 출력에서는 실행 Pod에서 확인한 digest로 고정한다. Kustomize 렌더링·서버 dry-run·diff 검토를 통과했다. 실제 digest 참조 구성의 적용은 아직 수행하지 않았다.

앱 각 1개, frontend Worker 02 / backend Worker 01 배치다. 백엔드는 prod 프로필 및 DEVFLOW_ENV=dev를 사용한다. JVM 힙 최대 256Mi, 컨테이너 최대 640Mi, Hikari 최대 5·최소 1이다. backend는 Recreate 전략으로 업데이트 중 중단이 발생한다.

Ingress의 /api는 backend:8080, /는 frontend:80에 연결한다. 소셜 로그인용 /oauth2·/login/oauth2 경로, TLS, 외부 actuator 공개는 이 변경에 포함하지 않는다. 토큰 암호화 전용 키는 팀 합의 후 별도 변경으로 추가한다.

## 검토 및 적용

저장소 루트에서 실행한다. 로컬 Docker는 필요하지 않다.

    kubectl kustomize k8s/overlays/onprem > /tmp/devflow-onprem-rendered.yaml
    kubectl apply --dry-run=server -k k8s/overlays/onprem
    kubectl diff -k k8s/overlays/onprem

diff의 종료 코드 1은 차이가 있다는 뜻이며 오류와 구분한다. 렌더링·서버 검증과 차이를 확인한 뒤 수동 적용하거나, 추후 Argo CD가 이 경로를 관리하도록 연결한다.

    kubectl apply -k k8s/overlays/onprem
    kubectl rollout status deployment/frontend -n devflow --timeout=600s
    kubectl rollout status deployment/backend -n devflow --timeout=600s

위 명령은 실행 절차이며 이번 파일 작성 과정에서 원격 클러스터에 적용한 것은 아니다. image 참조가 tag에서 digest로 바뀌면 동일 내용의 이미지여도 Pod 교체가 발생할 수 있다. backend가 Recreate이므로 유지보수 시점을 고려한다. 개별 YAML에 apply -f를 실행하면 digest 변환이 적용되지 않으므로 -k 진입점을 사용한다.

Git에 되돌릴 커밋을 만드는 것만으로 배포가 자동 변경되지는 않는다. Argo CD 도입 전에는 검토된 과거 구성을 수동 적용해야 한다. DB 마이그레이션은 앱 이미지 롤백과 별개이며 호환성을 먼저 검토한다.

