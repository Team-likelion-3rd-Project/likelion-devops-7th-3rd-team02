# Network 모듈 입력 변수

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "azs" {
  description = "List of availability zones"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDRs"
  type        = list(string)
}

variable "private_app_subnet_cidrs" {
  description = "List of private application subnet CIDRs"
  type        = list(string)
}

variable "private_db_subnet_cidrs" {
  description = "List of private database subnet CIDRs"
  type        = list(string)
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "eks_cluster_name" {
  description = "EKS cluster name (for subnet tags)"
  type        = string
  default     = ""
}
