# ExternalDNS IAM 모듈 입력 변수 (oidc_* 값은 EKS 모듈 출력에서 받는다)

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "oidc_provider_arn" {
  description = "ARN of the existing EKS OIDC provider reused for IRSA trust policy"
  type        = string
}

variable "oidc_issuer_url" {
  description = "OIDC issuer URL of the EKS cluster (https://oidc.eks.<region>.amazonaws.com/id/<id>)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Route53 Public Hosted Zone ID for manoit.co.kr that ExternalDNS is permitted to mutate records in"
  type        = string
}
