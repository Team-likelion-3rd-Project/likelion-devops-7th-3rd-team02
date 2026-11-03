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
  description = "Fully-qualified domain name for the ACM certificate (e.g. devflowlab.net)"
  type        = string
}

variable "hosted_zone_id" {
  description = "Existing public Route53 Hosted Zone ID of devflowlab.net (reused, not created here)"
  type        = string
}

variable "route53_record_ttl" {
  description = "TTL for the ACM DNS validation CNAME record in seconds"
  type        = number
  default     = 60
}

variable "create_validation_records" {
  description = "Create the Route53 DNS validation CNAME records for this certificate. Set false when an identical validation CNAME for the same (account, FQDN) is already owned by another module call (ACM reuses it across regions)."
  type        = bool
  default     = true
}

variable "external_validation_record_fqdns" {
  description = "FQDNs of validation CNAME records owned elsewhere. Used as the validation waiter dependency only when create_validation_records = false."
  type        = list(string)
  default     = []
}
