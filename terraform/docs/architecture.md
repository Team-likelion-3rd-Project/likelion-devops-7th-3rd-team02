# AWS 인프라 아키텍처

## 개요

이 문서는 DevFlow 프로젝트의 AWS 인프라 아키텍처를 설명합니다.

## 리전

- **리전**: `ap-northeast-1` (도쿄)

## VPC 설정

- **VPC CIDR**: `10.0.0.0/16`

## 가용 영역(Availability Zones)

- `ap-northeast-1a`
- `ap-northeast-1c`

## 서브넷 설정

| 서브넷 유형   | AZ-A (ap-northeast-1a) | AZ-B (ap-northeast-1c) |
| ------------- | ---------------------- | ---------------------- |
| 퍼블릭        | 10.0.1.0/24            | 10.0.2.0/24            |
| 프라이빗 (앱) | 10.0.10.0/24           | 10.0.11.0/24           |
| 프라이빗 (DB) | 10.0.20.0/24           | 10.0.21.0/24           |

## 네트워크 아키텍처

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                           VPC                           │
                    │                    10.0.0.0/16                          │
                    │                                                         │
                    │  ┌─────────────────┐      ┌───────────────────────────┐ │
                    │  │   Public Subnet │      │   Private App Subnet      │ │
                    │  │  AZ-A: .1.0/24  │      │  AZ-A: .2.0/24            │ │
                    │  └────────┬────────┘      └────────────┬──────────────┘ │
                    │           │                            │                │
                    │           │ IGW                        │ NAT Gateway    │
                    │           │ (0.0.0.0/0)                │ (1 EIP)        │
                    │           ▼                            ▼                │
                    │  ┌─────────────────┐      ┌───────────────────────────┐ │
                    │  │   Public Subnet │      │   Private App Subnet      │ │
                    │  │  AZ-B: .10.0/24 │      │  AZ-B: .11.0/24           │ │
                    │  └─────────────────┘      └───────────────────────────┘ │
                    │                                                         │
                    │  ┌─────────────────┐      ┌───────────────────────────┐ │
                    │  │   Private DB    │      │   Private DB              │ │
                    │  │  AZ-A: .20.0/24 │      │  AZ-B: .21.0/24           │ │
                    │  └─────────────────┘      └───────────────────────────┘ │
                    └─────────────────────────────────────────────────────────┘
```

## 네트워크 트래픽 흐름

### 퍼블릭 서브넷 트래픽

- 인터넷 → Elastic Load Balancer → 퍼블릭 서브넷 → 애플리케이션

### 프라이빗 애플리케이션 서브넷 트래픽

- 애플리케이션 → NAT Gateway → 인터넷 (아웃바운드만)
- 퍼블릭 서브넷에서 프라이빗 서브넷으로의 인바운드 트래픽: internal ALB 또는 VPC peering 사용

### 프라이빗 데이터베이스 서브넷 트래픽

- 직접 인터넷 접근 불가
- 프라이빗 애플리케이션 서브넷에서만 접근 가능
- 아웃바운드 접근 차단 (NAT Gateway 라우트 없음)

## NAT Gateway 설정

- **개수**: 1개 (비용 최적화)
- **위치**: AZ-A (ap-northeast-1a)
- **Elastic IP**: 1개 (NAT Gateway용)
- **가용성 참고사항**: 이 구성은 기본적인 인터넷 접근을 제공하지만 AZ 간 완전한 고가용성을 제공하지 않습니다. 프로덕션 환경에서는 AZ당 1개씩 NAT Gateway를 배포하는 것을 고려하세요.

## 서브넷 태깅

### 퍼블릭 서브넷

- `kubernetes.io/role/elb: 1` - 인터넷-facing ALB용
- `kubernetes.io/cluster/<cluster-name>: owned` - EKS 클러스터 discovering용

### 프라이빗 애플리케이션 서브넷

- `kubernetes.io/role/internal-elb: 1` - 인터널 ALB용
- `kubernetes.io/cluster/<cluster-name>: owned` - EKS 클러스터 discovering용

## Terraform 모듈 구조

```
terraform/
├── versions.tf           # Terraform & AWS provider 버전
├── providers.tf          # Provider 설정 및 태그
├── variables.tf          # 공통 변수
├── modules/
│   └── network/          # 네트워크 모듈
│       ├── variables.tf
│       ├── main.tf
│       └── outputs.tf
└── environments/
    └── dev/              # 개발 환경
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## 리소스 요약

| 리소스                              | 개수                        |
| ----------------------------------- | --------------------------- |
| VPC                                 | 1                           |
| 퍼블릭 서브넷                       | 2                           |
| 프라이빗 애플리케이션 서브넷        | 2                           |
| 프라이빗 데이터베이스 서브넷        | 2                           |
| Internet Gateway                    | 1                           |
| NAT Gateway                         | 1                           |
| Elastic IP                          | 1                           |
| 퍼블릭 라우트 테이블                | 1                           |
| 프라이빗 애플리케이션 라우트 테이블 | 1                           |
| 프라이빗 DB 라우트 테이블           | 0 (직접 인터넷 라우트 없음) |

## 보안 고려사항

- 프라이빗 데이터베이스 서브넷은 직접 인터넷 접근이 불가능합니다
- 모든 아웃바운드 인터넷 트래픽은 NAT Gateway를 통해 이루어집니다
- 퍼블릭 서브넷은 로드밸런서만 노출됩니다
- EKS 및 ALB 서브넷 태그는 자동 discovering를 위해 설정되었습니다
