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
