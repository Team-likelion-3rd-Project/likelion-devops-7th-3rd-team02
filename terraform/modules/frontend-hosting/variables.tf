# frontend-hosting 모듈 입력 변수 (Phase 3.2: Frontend S3 + CloudFront)

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "application_domain" {
  description = "Public domain served by CloudFront (team02-app.manoit.co.kr). Added as an alias before DNS cutover."
  type        = string
}

variable "alb_origin_hostname" {
  description = "Dedicated hostname that resolves to the existing application ALB and is used as the CloudFront backend origin (team02-app-alb.manoit.co.kr). DNS is created by ExternalDNS from the Ingress host entry, TLS by a separate ap-northeast-1 ACM certificate."
  type        = string
}

variable "cloudfront_acm_certificate_arn" {
  description = "us-east-1 ACM certificate ARN covering application_domain (required region for CloudFront viewer TLS)."
  type        = string
}

variable "s3_bucket_name" {
  description = "Frontend static asset bucket name. Empty = devflow-<environment>-frontend."
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
}
