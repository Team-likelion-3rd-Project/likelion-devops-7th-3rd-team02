# Application ACM 모듈 입력 변수

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Fully-qualified domain name for the ACM certificate (e.g. team02-app.manoit.co.kr)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Existing public Route53 Hosted Zone ID of manoit.co.kr (reused, not created here)"
  type        = string
}

variable "route53_record_ttl" {
  description = "TTL for the ACM DNS validation CNAME record in seconds"
  type        = number
  default     = 60
}
