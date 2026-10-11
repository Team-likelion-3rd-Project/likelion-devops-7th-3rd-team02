# Security 모듈 입력 변수

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "eks_node_security_group_id" {
  description = "EKS Node Security Group ID (for RDS access)"
  type        = string
  default     = ""
}

variable "eks_cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = ""
}


