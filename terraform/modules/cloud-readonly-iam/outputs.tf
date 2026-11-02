output "cloud_readonly_role_arn" {
  description = "IAM Role ARN users register in DevFlow project cloud settings (aws_role_arn field)"
  value       = aws_iam_role.cloud_readonly.arn
}

output "cloud_readonly_role_name" {
  description = "Name of the demo read-only IAM role"
  value       = aws_iam_role.cloud_readonly.name
}
