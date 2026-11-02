variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "backend_irsa_role_arn" {
  description = "ARN of the DevFlow Backend IRSA role allowed to assume the read-only role (sts:AssumeRole principal)"
  type        = string
}

variable "backend_irsa_role_name" {
  description = "Name of the DevFlow Backend IRSA role that receives the scoped sts:AssumeRole grant"
  type        = string
}

variable "external_id" {
  description = "sts:ExternalId condition value issued by DevFlow when the project cloud environment is registered. Required; the trust policy has no fallback without it."
  type        = string

  validation {
    condition     = length(var.external_id) >= 2 && length(var.external_id) <= 128
    error_message = "external_id must be the ExternalId shown by DevFlow when registering the project environment (2-128 characters)."
  }
}
