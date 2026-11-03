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

# EKS Node / RDS 용 Security Group
module "security" {
  source = "../../modules/security"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.network.vpc_id
  eks_node_security_group_id = ""
}

# devflowlab.net public hosted zone 조회 (여러 모듈에서 재사용)
# var.route53_zone_name(zone id Z0319887F0X04JRXN6SW) 기준. Terraform은 조회만 하고
# NS 위임은 레지스트라에서 선행 완료되어야 한다 (runbook §C-D1).
data "aws_route53_zone" "main" {
  name         = var.route53_zone_name
  private_zone = false
}

# ExternalDNS 용 IAM Role/Policy (IRSA)
module "external_dns_iam" {
  source = "../../modules/external-dns-iam"

  project_name      = var.project_name
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_provider_url

  # 위에서 조회한 devflowlab.net public hosted zone 을 재사용한다.
  hosted_zone_id = data.aws_route53_zone.main.zone_id

  # ExternalDNS 는 ALB origin 호스트(그리고 TXT 소유권 레코드)만 변경할 수 있다.
  # apex(application_domain) alias 는 Terraform 전용 — 덮어쓰기 방지 2중 defence 의
  # 권한 레이어 (소스 레이어: Ingress annotation-only).
  record_name = var.alb_origin_hostname
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

# Application ACM 인증서 (devflowlab.net ap-northeast-1, DNS 검증)
# devflowlab.net 검증 CNAME의 유일한 Terraform owner (create_validation_records 기본 true).
module "application_acm" {
  source = "../../modules/application-acm"

  project_name   = var.project_name
  environment    = var.environment
  domain_name    = var.application_domain
  hosted_zone_id = data.aws_route53_zone.main.zone_id
}

# CloudFront viewer TLS 용 (동일 FQDN, us-east-1).
# 동일 계정·동일 FQDN의 ACM DNS 검증 CNAME은 리전과 무관하게 동일하므로
# 레코드는 재생성하지 않고 application_acm 이 만든 CNAME 을 재사용한다.
# (중복 생성 시 Route53 "already exists" 로 최초 Apply 실패 — allow_overwrite 로 우회하지 않는다.)
module "frontend_cloudfront_acm" {
  source    = "../../modules/application-acm"
  providers = { aws = aws.us_east_1 }

  project_name   = var.project_name
  environment    = var.environment
  domain_name    = var.application_domain
  hosted_zone_id = data.aws_route53_zone.main.zone_id

  create_validation_records        = false
  external_validation_record_fqdns = module.application_acm.validation_record_fqdns
}

# ALB Origin 전용 호스트(origin.devflowlab.net) 의 TLS 인증서 (CloudFront -> ALB https_only).
# LBC 가 Ingress tls.hosts 로부터 자동 탐색(discovery)하므로 YAML 에 ARN 을 넣지 않는다.
# 다른 FQDN 이므로 검증 CNAME 도 별도로 생성한다 (alb_origin_acm 이 owner).
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

# Cutover 전 상태의 alias 대상(ALB) 조회.
# LBC 로 생성된 application ALB 만 고르도록 LBC 기본 ALB 태그로 필터한다
# (elbv2.k8s.aws/cluster + ingress.k8s.aws/stack = <namespace>/<ingress-name>).
data "aws_lb" "app" {
  count = var.frontend_dns_takeover ? 1 : 0

  tags = {
    "elbv2.k8s.aws/cluster" = "${var.project_name}-${var.environment}-eks"
    "ingress.k8s.aws/stack" = "devflow/devflow-ingress"
  }
}

# apex application_domain(devflowlab.net) A alias 의 단일 owner 는 Terraform 이다.
# ExternalDNS 는 Ingress annotation-only 설정으로 origin 호스트만 register 하고,
# IAM 도 origin 레코드명만 허용하므로 apex 를 덮어쓸 수 없다.
# 신규 계정 최초 배포 순서:
#   1) takeover=false, cutover=false 로 apply (기본 인프라)
#   2) EKS/ArgoCD 로 Ingress 배포 → ALB 생성 (data.aws_lb.app 조회 가능 상태)
#   3) takeover=true, cutover=true 로 apply → alias→CloudFront 신규 생성 (import 불요)
# (ExternalDNS 가 apex 를 관리하던 구계정 import 절차는 git history 참조)
# Rollback: frontend_dns_cutover=false (레코드 삭제 없이 alias target 만 ALB 로 atomic 복귀)
resource "aws_route53_record" "frontend" {
  count = var.frontend_dns_takeover ? 1 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.application_domain
  type    = "A"

  # ExternalDNS 관리 레코드를 인수하는 기존 계정 절차(import)의 CREATE 충돌 방지 안전장치.
  # 신규 계정에서는 레코드가 없으므로 plain CREATE 로 생성된다.
  allow_overwrite = true

  alias {
    name                   = var.frontend_dns_cutover ? module.frontend_hosting.cloudfront_domain_name : data.aws_lb.app[0].dns_name
    zone_id                = var.frontend_dns_cutover ? module.frontend_hosting.cloudfront_hosted_zone_id : data.aws_lb.app[0].zone_id
    evaluate_target_health = var.frontend_dns_cutover ? false : true
  }
}

module "github_actions_iam" {
  source = "../../modules/github-actions-iam"

  project_name               = var.project_name
  environment                = var.environment
  github_repository          = var.github_repository
  github_environment         = var.github_environment
  s3_bucket_arn              = module.frontend_hosting.s3_bucket_arn
  cloudfront_distribution_id = module.frontend_hosting.cloudfront_distribution_id
}

module "attachment_storage" {
  source = "../../modules/attachment-storage"

  project_name      = var.project_name
  environment       = var.environment
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_issuer_url   = module.eks.oidc_provider_url
}

module "cloud_readonly_iam" {
  source = "../../modules/cloud-readonly-iam"

  project_name           = var.project_name
  environment            = var.environment
  backend_irsa_role_arn  = module.attachment_storage.backend_irsa_role_arn
  backend_irsa_role_name = module.attachment_storage.backend_irsa_role_name
  external_id            = var.cloud_readonly_external_id
}
