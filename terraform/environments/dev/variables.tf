# dev 환경 입력 변수. db_password 와 certificate_arn 은 기본값이 없으므로
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
variable "gitlab_instance_type" {
  description = "Gitlab Instance type"
  type        = string
  default     = "t3.large"
}

variable "gitlab_ami_id" {
  description = "Gitlab ami id"
  type        = string
  default     = "ami-05f4eb3328c0dabc5"
}

variable "gitlab_hostname" {
  description = "Gitlab external hostname"
  type        = string
  default     = "team02-gitlab.manoit.co.kr"
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
  default     = false
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

variable "certificate_arn" {
  description = "ACM arn (GitLab ALB HTTPS listener)"
  type        = string
  sensitive   = true
}

variable "application_domain" {
  description = "Application domain covered by the Application ACM certificate (team02-app.manoit.co.kr). Must NOT be confused with the GitLab domain team02-gitlab.manoit.co.kr."
  type        = string
  default     = "team02-app.manoit.co.kr"
}

# --- Phase 3.2: Frontend S3 + CloudFront -------------------------------------

variable "alb_origin_hostname" {
  description = "Dedicated hostname that ExternalDNS points at the application ALB, used as the CloudFront backend origin (avoids team02-app -> CloudFront -> team02-app self-reference). Its DNS record comes from the Ingress albOriginHost entry, TLS from alb_origin ACM below."
  type        = string
  default     = "team02-app-alb.manoit.co.kr"
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

