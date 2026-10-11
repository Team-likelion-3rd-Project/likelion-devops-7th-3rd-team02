# GitLab 모듈 입력 변수

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

variable "ami_id" {
  description = "AMI ID for GitLab EC2"
  type        = string
}

variable "root_volume_size" {
  description = "Root volume size in GB"
  type        = number
  default     = 50
}

variable "root_volume_type" {
  description = "Root volume type"
  type        = string
  default     = "gp3"
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID where GitLab EC2 will be placed"
  type        = string
}

variable "security_group_id" {
  description = "Security Group ID for GitLab (from security module)"
  type        = string
}

variable "instance_name" {
  description = "Name tag for GitLab EC2 instance"
  type        = string
  default     = "gitlab"
}

variable "gitlab_hostname" {
  description = "Gitlab external hostname"
  type        = string
}

