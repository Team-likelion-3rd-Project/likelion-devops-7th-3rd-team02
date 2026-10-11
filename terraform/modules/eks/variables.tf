# EKS 모듈 입력 변수

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "private_app_subnet_ids" {
  description = "Private Application subnet IDs for EKS worker nodes and cluster endpoints"
  type        = list(string)
}

variable "eks_node_security_group_id" {
  description = "Existing DevFlow EKS Node Security Group ID (preserves RDS TCP/5432 source relationship)"
  type        = string
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Fixed to 1.36 per project configuration."
  type        = string
  default     = "1.36"
}

variable "node_instance_type" {
  description = "EC2 instance type for managed node group"
  type        = string
  default     = "t3.large"
}

variable "node_min_size" {
  description = "Minimum size of the managed node group"
  type        = number
  default     = 2
}

variable "node_desired_size" {
  description = "Desired size of the managed node group"
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum size of the managed node group"
  type        = number
  default     = 4
}

variable "enabled_cluster_log_types" {
  description = "List of enabled EKS control-plane log types"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "gitlab_security_group_id" {
  description = "Security Group ID of the GitLab Runner host allowed to access the EKS private API endpoint"
  type        = string
}

variable "gitlab_runner_role_arn" {
  description = "IAM role ARN used by GitLab Runner for EKS authentication"
  type        = string
}
