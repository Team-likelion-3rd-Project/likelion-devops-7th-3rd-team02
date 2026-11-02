# 온프레미스 Prometheus Tailscale 연결

## 목적

AWS EKS의 DevFlow Backend가 온프레미스 Prometheus를 조회할 수 있도록
Tailscale 전용 접속 경로를 구성한다.

기존 Prometheus Helm 릴리스와 ClusterIP Service는 유지한다.
이 디렉터리는 현재 Argo CD Application의 동기화 대상이 아니며,
운영자가 별도로 적용한다.

## 구성

- Helm 릴리스: tailscale-operator
- 차트: tailscale/tailscale-operator
- 차트 버전: 1.104.2
- Operator 네임스페이스: tailscale
- Operator 배치: onprem-worker-01
- Operator 태그: tag:devflow-onprem-operator
- Prometheus 프록시 태그: tag:devflow-onprem-prometheus
- 전용 Service: monitoring/onprem-prometheus-tailnet
- 프로토콜 및 포트: TCP 9090
- Kubernetes API 서버 프록시: 비활성화
- NodePort 자동 할당: 비활성화

## 설치 전 준비

Tailscale 관리자가 태그 소유권과 접근 정책을 먼저 구성한다.

- 온프레미스 Operator는 Prometheus 프록시 태그를 부여할 수 있어야 한다.
- AWS Egress Proxy 태그는 tag:devflow-eks-egress를 사용한다.
- AWS Egress Proxy에서 Prometheus 프록시의 TCP 9090만 허용한다.
- 기존 전체 허용 규칙이 남아 있으면 포트 제한이 성립하지 않는다.
- 기존 팀원 접속 규칙은 별도로 유지하고 접속을 재확인한다.

OAuth client는 환경별로 분리한다.
온프레미스 client의 태그 범위는 tag:devflow-onprem-operator로 지정한다.
Operator 설치 문서에 따라 Services, Devices Core, Auth Keys 권한을 준비한다.

tailscale 네임스페이스에 operator-oauth Secret을 미리 생성한다.
필요한 키는 client_id와 client_secret이다.
인증정보는 로컬에서 숨김 입력하고 Secret으로 등록한다.

OAuth 값, Secret 원문, kubeconfig는 Git에 저장하지 않는다.
Helm의 명령행 인자나 values 파일에도 인증정보를 넣지 않는다.

## 설치 및 적용

저장소 루트의 CP 터미널에서 실행한다.

    helm repo add tailscale https://pkgs.tailscale.com/helmcharts
    helm repo update tailscale

    helm upgrade --install tailscale-operator tailscale/tailscale-operator --version 1.104.2 --namespace tailscale --create-namespace -f k8s/bootstrap/onprem/tailscale/operator-values.yaml --wait --timeout 180s

    kubectl apply --dry-run=server -f k8s/bootstrap/onprem/tailscale/prometheus-service.yaml
    kubectl apply -f k8s/bootstrap/onprem/tailscale/prometheus-service.yaml

## 검증

    kubectl get pods -n tailscale -o wide
    kubectl top pods -n tailscale
    kubectl get service onprem-prometheus-tailnet -n monitoring -o wide
    kubectl get endpointslice -n monitoring -l kubernetes.io/service-name=onprem-prometheus-tailnet

Tailscale 관리 화면에서 Operator와 프록시의 등록 및 태그를 확인한다.
Service 포트는 NodePort 없이 9090/TCP로 표시되어야 한다.

2026-11-02 온프레미스 검증 결과:

- Operator와 프록시 Pod 각각 1/1 Running
- Prometheus Endpoint 연결 확인
- NodePort 제거 확인
- 프록시의 Tailscale 태그 확인
- 당시 메모리 사용량: Operator 약 19Mi, 프록시 약 16Mi
- AWS 담당자에게 MagicDNS 주소와 포트 전달 완료
- AWS Egress 연결 및 Backend API 조회 검증은 대기 중

## AWS 연결

AWS Egress Service의 대상으로 프록시의 전체 MagicDNS 이름을 사용한다.
실제 주소는 Service 상태와 Tailscale 관리 화면에서 확인한다.
장비를 삭제하고 다시 생성하면 주소를 다시 확인한다.

합의한 AWS Backend 등록 주소:

    http://onprem-prometheus.devflow.svc.cluster.local:9090

AWS에서 다음 경로를 순서대로 검증한다.

- /-/ready
- /api/v1/query?query=up
- DevFlow의 환경 연결 확인 및 실제 지표 조회

Backend의 주소 검증 정책에서도 해당 Service 접근을 허용해야 한다.
전체 사설망 접근 허용으로 대체하지 않고 대상 주소와 해석 결과를 검토한다.

## 운영 제한 및 복구

- 노트북과 VM이 실행 중이어야 온프레미스 지표 조회가 가능하다.
- 현재 프록시는 단일 Pod이며 재시작 시 일시적으로 연결이 중단될 수 있다.
- 프록시 Pod의 자원 제한과 배치 위치는 별도 ProxyClass로 설정하지 않았다.
- Tailscale 접근 정책은 클러스터 내부의 모든 접근을 제한하는 정책이 아니다.
- 기존 onprem-prometheus Service는 클러스터 내부에서 계속 사용한다.
- Windows DevFlow 접속용 포트 전달과 이 연결은 별개이다.
- 일반 팀원 장비에는 Prometheus 접속 권한을 부여하지 않았다.

Tailscale 노출을 철회할 때는 전용 Service만 삭제한다.

    kubectl delete -f k8s/bootstrap/onprem/tailscale/prometheus-service.yaml

삭제 후 프록시 리소스 정리 여부와 기존 Prometheus 동작을 확인한다.
다시 적용한 경우 MagicDNS 주소와 AWS 연결을 재검증한다.
