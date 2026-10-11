# RDS 모듈 입력 변수 (db_password 는 sensitive 값이므로 코드에 하드코딩하지 않는다)

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "devflow_db"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 50
}

variable "engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.18"
}

variable "engine" {
  description = "SQL Engine"
  type        = string
  default     = "postgres"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of private DB subnet IDs"
  type        = list(string)
}

variable "security_group_id" {
  description = "RDS Security Group ID"
  type        = string
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}
