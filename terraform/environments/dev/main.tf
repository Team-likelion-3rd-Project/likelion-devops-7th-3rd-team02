# dev 환경 루트: 각 모듈을 조합해 DevFlow 인프라를 구성한다.

# VPC / Subnet / NAT / Route Table
module "network" {
  source = "../../modules/network"

  vpc_cidr                 = "10.0.0.0/16"
  azs                      = ["ap-northeast-1a", "ap-northeast-1c"]
  public_subnet_cidrs      = ["10.0.1.0/24", "10.0.2.0/24"]
  private_app_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
  private_db_subnet_cidrs  = ["10.0.20.0/24", "10.0.21.0/24"]
  project_name             = var.project_name
  environment              = var.environment
  eks_cluster_name         = "${var.project_name}-${var.environment}-eks"
}

# ALB / GitLab / EKS Node / RDS 용 Security Group
module "security" {
  source = "../../modules/security"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  eks_node_security_group_id = ""
}

# GitLab EC2 (Public Subnet)
module "gitlab" {
  source = "../../modules/gitlab"

  project_name      = var.project_name
  environment       = var.environment
  instance_type     = var.gitlab_instance_type
  ami_id            = var.gitlab_ami_id
  vpc_id            = module.network.vpc_id
  subnet_id         = module.network.public_subnet_ids[0]
  security_group_id = module.security.gitlab_security_group_id
  gitlab_hostname   = var.gitlab_hostname
}

module "gitlab-alb" {
  source = "../../modules/gitlab-alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.public_subnet_ids
  security_group_id = module.security.alb_security_group_id

  gitlab_instance_id = module.gitlab.instance_id

  certificate_arn = var.certificate_arn
}

# 기존 manoit.co.kr public hosted zone 조회 (여러 모듈에서 재사용)
data "aws_route53_zone" "main" {
  name         = "manoit.co.kr"
  private_zone = false
}

# GitLab DNS: team02-gitlab.manoit.co.kr -> GitLab ALB
# (Application 도메인과 달리 ExternalDNS 가 아니라 Terraform 이 관리한다)
resource "aws_route53_record" "gitlab" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "team02-gitlab.manoit.co.kr"
  type    = "A"

  alias {
    name                   = module.gitlab-alb.alb_dns_name
    zone_id                = module.gitlab-alb.alb_zone_id
    evaluate_target_health = true
  }
}

# ExternalDNS 용 IAM Role/Policy (IRSA)
module "external_dns_iam" {
  source = "../../modules/external-dns-iam"

  project_name      = var.project_name
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_provider_url

  # 위에서 조회한 manoit.co.kr public hosted zone 을 재사용한다.
  hosted_zone_id = data.aws_route53_zone.main.zone_id
}

module "rds" {
  source = "../../modules/rds"

  project_name      = var.project_name
  environment       = var.environment
  db_name           = var.db_name
  db_username       = var.db_username
  db_password       = var.db_password
  instance_class    = var.db_instance
  allocated_storage = var.db_storage
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.private_db_subnet_ids
  security_group_id = module.security.rds_security_group_id
  multi_az          = var.db_multiaz
}

# EKS 클러스터 + Managed Node Group (Node 2~4)
module "eks" {
  source = "../../modules/eks"

  project_name               = var.project_name
  environment                = var.environment
  private_app_subnet_ids     = module.network.private_app_subnet_ids
  eks_node_security_group_id = module.security.eks_node_security_group_id
  gitlab_security_group_id   = module.security.gitlab_security_group_id
  gitlab_runner_role_arn     = module.gitlab.iam_role_arn
  kubernetes_version         = var.kubernetes_version
  node_instance_type         = var.node_instance_type
  node_min_size              = 2
  node_desired_size          = 2
  node_max_size              = 4
}

# AWS Load Balancer Controller 용 IAM Role/Policy (IRSA)
module "alb_controller_iam" {
  source = "../../modules/alb-controller-iam"

  project_name      = var.project_name
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_provider_url
}

# Application ACM 인증서 (team02-app.manoit.co.kr, DNS 검증)
# GitLab 쪽 DNS/ALB/ACM 은 건드리지 않는다.
module "application_acm" {
  source = "../../modules/application-acm"

  project_name   = var.project_name
  environment    = var.environment
  domain_name    = var.application_domain
  hosted_zone_id = data.aws_route53_zone.main.zone_id
}

module "frontend_cloudfront_acm" {
  source    = "../../modules/application-acm"
  providers = { aws = aws.us_east_1 }

  project_name   = var.project_name
  environment    = var.environment
  domain_name    = var.application_domain
  hosted_zone_id = data.aws_route53_zone.main.zone_id
}

# ALB Origin 전용 호스트(team02-app-alb) 의 TLS 인증서 (CloudFront -> ALB https_only).
# LBC 가 Ingress tls.hosts 로부터 자동 탐색(discovery)하므로 YAML 에 ARN 을 넣지 않는다.
module "alb_origin_acm" {
  source = "../../modules/application-acm"

  project_name   = var.project_name
  environment    = var.environment
  domain_name    = var.alb_origin_hostname
  hosted_zone_id = data.aws_route53_zone.main.zone_id
}

module "frontend_hosting" {
  source = "../../modules/frontend-hosting"

  project_name                   = var.project_name
  environment                    = var.environment
  application_domain             = var.application_domain
  alb_origin_hostname            = var.alb_origin_hostname
  cloudfront_acm_certificate_arn = module.frontend_cloudfront_acm.certificate_arn
}

data "aws_caller_identity" "current" {}

# takeover 시 인수할 기존 Route53 A alias 의 대상(ALB) 조회.
# LBC 로 생성된 application ALB 만 고르도록 EKS 클러스터+namespace:Ingress 태그로 필터한다
# (GitLab ALB 등 동일 계정의 다른 ALB 와 구분).
data "aws_lb" "app" {
  count = var.frontend_dns_takeover ? 1 : 0

  tags = {
    "elbv2.k8s.aws/cluster"   = "${var.project_name}-${var.environment}-eks"
    "elbv2.k8s.aws/namespace" = "devflow:devflow-ingress"
  }
}

# Cutover 전: ExternalDNS(upsert-only) 가 team02-app 레코드를 관리한다.
# Cutover 절차(runbook step 8~11):
#   1) ExternalDNS --exclude-domains 에 team02-app 추가 후 재적용 (레코드는 현행 유지)
#   2) terraform import aws_route53_record.frontend[0] <zone>_team02-app.manoit.co.kr_A
#      (count 기반이므로 import 주소에 [0] 필수; import 생략 시 allow_overwrite=true 가 UPSERT 대안)
#   3) frontend_dns_takeover=true apply  -> target ALB 유지 상태로 소유권만 이전 (diff no-op)
#   4) frontend_dns_cutover=true apply   -> alias target 을 CloudFront 로 atomic 교체
# Rollback: frontend_dns_cutover=false (레코드 삭제 없이 target 만 ALB 로 복귀)
resource "aws_route53_record" "frontend" {
  count = var.frontend_dns_takeover ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.application_domain
  type    = "A"

  # ExternalDNS 가 만든 기존 레코드를 인수하는 것이므로 CREATE 충돌 방지.
  # 권장 절차는 import 이고, 이 값은 그 없는우의 안전장치(UPSERT)다.
  allow_overwrite = true

  alias {
    name                   = var.frontend_dns_cutover ? module.frontend_hosting.cloudfront_domain_name : data.aws_lb.app[0].dns_name
    zone_id                = var.frontend_dns_cutover ? module.frontend_hosting.cloudfront_hosted_zone_id : data.aws_lb.app[0].zone_id
    evaluate_target_health = var.frontend_dns_cutover ? false : true
  }
}

# GitLab Runner(GitLab EC2 instance profile)의 Frontend S3 배포 + 무효화 최소 권한.
# 자격증명은 코드에 넣지 않는다 (instance profile 로 인증).
resource "aws_iam_role_policy" "gitlab_frontend_deploy" {
  name = "gitlab-frontend-deploy"
  role = module.gitlab.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid      = "FrontendBucketObjects"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${module.frontend_hosting.s3_bucket_arn}/*"
      },
      {
        Sid      = "FrontendBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = module.frontend_hosting.s3_bucket_arn
      },
      {
        Sid      = "CloudFrontInvalidation"
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
        Resource = "arn:aws:cloudfront:${data.aws_caller_identity.current.account_id}:distribution/${module.frontend_hosting.cloudfront_distribution_id}"
      }
    ]
  })
}

# GitLab Runner 가 kubeconfig 를 갱신할 수 있도록 eks:DescribeCluster 만 허용
resource "aws_iam_role_policy" "gitlab_eks_describe" {
  name = "gitlab-eks-describe"
  role = module.gitlab.iam_role_name

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "eks:DescribeCluster"
        ]

        Resource = module.eks.cluster_arn
      }
    ]
  })
}
