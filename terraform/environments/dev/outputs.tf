# dev 환경 출력값. 배포 후 Kubernetes YAML 의 placeholder 를 채울 때 사용한다.
#   terraform -chdir=terraform/environments/dev output -raw <이름>

output "vpc_id" {
  description = "VPC ID"
  value       = module.network.vpc_id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.network.public_subnet_ids
}

output "private_app_subnet_ids" {
  description = "List of private application subnet IDs"
  value       = module.network.private_app_subnet_ids
}

output "private_db_subnet_ids" {
  description = "List of private database subnet IDs"
  value       = module.network.private_db_subnet_ids
}

output "alb_security_group_id" {
  description = "ALB Security Group ID"
  value       = module.security.alb_security_group_id
}

output "gitlab_security_group_id" {
  description = "GitLab Security Group ID"
  value       = module.security.gitlab_security_group_id
}

output "eks_node_security_group_id" {
  description = "EKS Node Security Group ID"
  value       = module.security.eks_node_security_group_id
}

output "rds_security_group_id" {
  description = "RDS Security Group ID"
  value       = module.security.rds_security_group_id
}

output "gitlab_instance_id" {
  description = "GitLab EC2 Instance ID"
  value       = module.gitlab.instance_id
}

output "gitlab_private_ip" {
  description = "GitLab EC2 Private IP"
  value       = module.gitlab.private_ip
}

output "gitlab_public_ip" {
  description = "GitLab EC2 Public IP"
  value       = module.gitlab.public_ip
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "rds_port" {
  description = "RDS port"
  value       = module.rds.port
}

output "db_subnet_group_name" {
  description = "RDS DB subnet group name"
  value       = module.rds.db_subnet_group_name
}

# --- EKS -----------------------------------------------------------------
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint (private + public)"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_version" {
  description = "Kubernetes version in use on the EKS cluster"
  value       = module.eks.cluster_version
}

output "eks_cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane (created by EKS)"
  value       = module.eks.cluster_security_group_id
}

output "eks_cluster_role_arn" {
  description = "IAM role ARN for the EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "eks_node_role_arn" {
  description = "IAM role ARN for managed node group EC2 instances"
  value       = module.eks.node_role_arn
}

output "eks_vpc_cni_role_arn" {
  description = "Dedicated IAM role ARN used by kube-system/aws-node (VPC CNI)"
  value       = module.eks.vpc_cni_role_arn
}

output "eks_oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for service-account-level IAM integration"
  value       = module.eks.oidc_provider_arn
}

output "eks_oidc_provider_url" {
  description = "URL of the EKS OIDC provider"
  value       = module.eks.oidc_provider_url
}

output "eks_node_group_name" {
  description = "EKS managed node group name"
  value       = module.eks.node_group_name
}

output "eks_launch_template_id" {
  description = "Launch template ID used by the managed node group (enforces DevFlow EKS Node SG)"
  value       = module.eks.launch_template_id
}

# --- Application ACM ----------------------------------------------------------
output "application_acm_certificate_arn" {
  description = "ACM Certificate ARN for the application domain team02-app.manoit.co.kr. Use in Kubernetes Ingress annotation: alb.ingress.kubernetes.io/certificate-arn"
  value       = module.application_acm.certificate_arn
}

output "application_acm_certificate_id" {
  description = "ACM Certificate ID for the application domain team02-app.manoit.co.kr"
  value       = module.application_acm.certificate_id
}

# --- ALB Controller IAM ---------------------------------------------------
output "alb_controller_role_arn" {
  description = "IAM Role ARN for AWS Load Balancer Controller (for ServiceAccount annotation eks.amazonaws.com/role-arn)"
  value       = module.alb_controller_iam.role_arn
}

output "alb_controller_role_name" {
  description = "IAM Role name for AWS Load Balancer Controller"
  value       = module.alb_controller_iam.role_name
}

output "alb_controller_policy_arn" {
  description = "IAM Policy ARN of the official AWS Load Balancer Controller policy (v2.14.1)"
  value       = module.alb_controller_iam.policy_arn
}

# --- ExternalDNS IAM ------------------------------------------------------
output "external_dns_role_arn" {
  description = "IAM Role ARN for ExternalDNS (for ServiceAccount annotation eks.amazonaws.com/role-arn). Scoped to Route53 changes in manoit.co.kr hosted zone."
  value       = module.external_dns_iam.role_arn
}

output "external_dns_role_name" {
  description = "IAM Role name for ExternalDNS"
  value       = module.external_dns_iam.role_name
}

output "external_dns_policy_arn" {
  description = "IAM Policy ARN of the ExternalDNS Route53 least-privilege policy (scoped to manoit.co.kr hosted zone)"
  value       = module.external_dns_iam.policy_arn
}

# --- Phase 3.2: Frontend S3 + CloudFront --------------------------------------
output "frontend_s3_bucket" {
  description = "Private frontend static bucket name. CI variable FRONTEND_S3_BUCKET: terraform -chdir=terraform/environments/dev output -raw frontend_s3_bucket"
  value       = module.frontend_hosting.s3_bucket_id
}

output "frontend_cloudfront_distribution_id" {
  description = "CloudFront distribution id. CI variable CLOUDFRONT_DISTRIBUTION_ID: terraform -chdir=terraform/environments/dev output -raw frontend_cloudfront_distribution_id"
  value       = module.frontend_hosting.cloudfront_distribution_id
}

output "frontend_cloudfront_domain_name" {
  description = "CloudFront distribution domain. Pre-cutover smoke-test target (temporary CloudFront domain)."
  value       = module.frontend_hosting.cloudfront_domain_name
}

output "frontend_cloudfront_acm_certificate_arn" {
  description = "us-east-1 ACM certificate ARN used by CloudFront viewer TLS for team02-app.manoit.co.kr"
  value       = module.frontend_cloudfront_acm.certificate_arn
}

output "alb_origin_acm_certificate_arn" {
  description = "ap-northeast-1 ACM certificate ARN for the CloudFront->ALB origin host (team02-app-alb.manoit.co.kr). Discovered automatically by the ALB controller via Ingress tls.hosts."
  value       = module.alb_origin_acm.certificate_arn
}

output "alb_origin_hostname" {
  description = "Dedicated ALB origin hostname used in the Helm value ingress.albOriginHost (GitOps per-env values)."
  value       = var.alb_origin_hostname
}

# --- GitHub Actions OIDC ------------------------------------------------------
output "github_actions_role_arn" {
  description = "IAM Role ARN for GitHub Actions OIDC. GitHub Actions variable AWS_DEPLOY_ROLE_ARN: terraform -chdir=terraform/environments/dev output -raw github_actions_role_arn"
  value       = module.github_actions_iam.role_arn
}

output "github_actions_trust_condition_sub" {
  description = "Exact OIDC sub claim the role trusts. On Not authorized to perform sts:AssumeRoleWithWebIdentity, compare with the claim printed in the workflow log."
  value       = module.github_actions_iam.trust_condition_sub
}
