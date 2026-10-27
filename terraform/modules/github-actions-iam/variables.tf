variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "github_oidc_url" {
  description = "GitHub Actions OIDC issuer URL used as the IAM identity provider"
  type        = string
  default     = "https://token.actions.githubusercontent.com"
}

variable "github_repository" {
  description = "GitHub repository in owner/repository form, exactly as it appears in the OIDC repository claim (owner casing matters)"
  type        = string
}

variable "github_environment" {
  description = "GitHub Actions environment name allowed to assume the role (the job must declare this environment)"
  type        = string
  default     = "dev"
}

variable "s3_bucket_arn" {
  description = "ARN of the frontend static bucket that the workflow may sync"
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "CloudFront distribution id that the workflow may invalidate"
  type        = string
}
