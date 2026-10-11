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

variable "subnet_ids" {
  description = "List of public subnet IDs for ALB"
  type        = list(string)
}

variable "security_group_id" {
  description = "Security Group ID for GitLab ALB (from security module alb_security_group_id)"
  type        = string
}


variable "certificate_arn" {
  description = "ACM Certificate ARN for HTTPS listener"
  type        = string

}

variable "gitlab_instance_id" {
  description = "GitLab EC2 instance ID registered with ALB target groups"
  type        = string
}
