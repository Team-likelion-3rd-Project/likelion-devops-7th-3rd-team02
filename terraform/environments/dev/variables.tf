# dev 환경 입력 변수. db_password 는 기본값이 없으므로
# tfvars 또는 환경변수(TF_VAR_*)로 주입한다.

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "devflow"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "db_name" {
  description = "DB name"
  type        = string
  default     = "deflow_db"
}

variable "db_username" {
  description = "DB UserName"
  type        = string
  default     = "dbadmin"
}

variable "db_instance" {
  description = "DB instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_storage" {
  description = "DB Storage"
  type        = number
  default     = 50
}

variable "db_multiaz" {
  description = "DB MultiAz"
  type        = bool
  default     = true
}

variable "db_password" {
  description = "Database password (sensitive)"
  type        = string
  sensitive   = true
}

variable "kubernetes_version" {
  description = "Kubernetes Vesion"
  type        = string
  default     = "1.36"
}

variable "node_instance_type" {
  description = "Node Instance Type"
  type        = string
  default     = "t3.large"
}

variable "application_domain" {
  description = "Public application domain served by CloudFront and covered by the application ACM certificates (devflowlab.net). Must NOT be confused with the legacy GitLab domains."
  type        = string
  default     = "devflowlab.net"
}

variable "route53_zone_name" {
  description = "Name of the existing public Route53 hosted zone holding the application DNS records (devflowlab.net, zone id Z0319887F0X04JRXN6SW). Terraform only looks the zone up; NS delegation at the registrar is a prerequisite - see docs/migration/rds-multiaz-fresh-account-runbook.md."

  type        = string
  default     = "devflowlab.net"
}

# --- Phase 3.2: Frontend S3 + CloudFront -------------------------------------

variable "alb_origin_hostname" {
  description = "Dedicated hostname that ExternalDNS points at the application ALB, used as the CloudFront backend origin (origin.devflowlab.net; avoids the apex -> CloudFront -> apex self-reference). Its DNS record comes from the Ingress albOriginHost entry (annotation-only), TLS from alb_origin ACM below. The apex application_domain alias is Terraform-owned."
  type        = string
  default     = "origin.devflowlab.net"
}

variable "frontend_dns_takeover" {
  description = "Phase 3.2 DNS ownership step 1: Terraform takes over the existing application_domain A/alias record (target stays the ALB). Requires `terraform import` of the live ExternalDNS-managed record first - see docs/migration/phase-3.2-cutover-runbook.md. Keep false until AWS access is approved and ExternalDNS excludes the domain."
  type        = bool
  default     = false
}

variable "frontend_dns_cutover" {
  description = "Phase 3.2 DNS ownership step 2: switch the taken-over application_domain alias target from the ALB to CloudFront. Rollback = set false again (atomic alias update, no record delete)."
  type        = bool
  default     = false
}
variable "github_repository" {
  description = "GitHub repository (owner/repository) whose Actions workflows may assume the deploy role. Must match the OIDC repository claim exactly, including owner casing."
  type        = string
  default     = "Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02"
}

variable "github_environment" {
  description = "GitHub Actions environment allowed to assume the deploy role. Jobs declaring a different environment cannot assume it."
  type        = string
  default     = "dev"
}

variable "cloud_readonly_external_id" {
  description = "sts:ExternalId issued by DevFlow when the project cloud environment is registered (CL2 screen). Required input for the demo read-only role trust policy; no default so a plan without it fails instead of building a loose trust."
  type        = string
}
