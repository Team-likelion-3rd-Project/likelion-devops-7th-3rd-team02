# 첨부파일 S3 버킷 모듈 입력 변수

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "abort_incomplete_multipart_upload_days" {
  description = "Days after which incomplete multipart uploads are removed"
  type        = number
  default     = 7
}

variable "oidc_provider_arn" {
  description = "ARN of the existing EKS OIDC provider used for the Backend IRSA trust policy"
  type        = string
}

variable "oidc_issuer_url" {
  description = "URL of the existing EKS OIDC provider (issuer), used in trust policy conditions"
  type        = string
}

variable "backend_namespace" {
  description = "Kubernetes namespace of the DevFlow Backend ServiceAccount trusted by the IRSA role"
  type        = string
  default     = "devflow"
}

variable "backend_service_account" {
  description = "Kubernetes ServiceAccount name of the DevFlow Backend trusted by the IRSA role"
  type        = string
  default     = "backend-sa"
}
