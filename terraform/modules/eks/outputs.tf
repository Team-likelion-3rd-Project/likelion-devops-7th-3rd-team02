# EKS 모듈 출력값 (다른 모듈의 IRSA 설정에서 OIDC 관련 값을 참조한다)

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "cluster_endpoint" {
  description = "EKS cluster API endpoint (private + public)"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "Kubernetes version in use on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster control plane (created by EKS)"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN for the EKS cluster"
  value       = aws_iam_role.eks_cluster.arn
}

output "node_role_arn" {
  description = "IAM role ARN for managed node group EC2 instances"
  value       = aws_iam_role.eks_node.arn
}

output "vpc_cni_role_arn" {
  description = "Dedicated IAM role ARN used by the kube-system/aws-node ServiceAccount (VPC CNI)"
  value       = aws_iam_role.vpc_cni.arn
}

output "oidc_provider_arn" {
  description = "ARN of the EKS OIDC provider for service-account-level IAM integration"
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "oidc_provider_url" {
  description = "URL of the EKS OIDC provider"
  value       = aws_iam_openid_connect_provider.eks.url
}

output "node_group_name" {
  description = "EKS managed node group name"
  value       = aws_eks_node_group.main.node_group_name
}

output "launch_template_id" {
  description = "Launch template ID used by the managed node group (enforces DevFlow EKS Node SG)"
  value       = aws_launch_template.eks_node.id
}