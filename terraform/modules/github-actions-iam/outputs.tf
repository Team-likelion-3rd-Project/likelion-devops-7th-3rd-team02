output "role_arn" {
  description = "IAM Role ARN assumed by GitHub Actions via OIDC (configure-aws-credentials role-to-assume)"
  value       = aws_iam_role.actions.arn
}

output "role_name" {
  description = "IAM Role name assumed by GitHub Actions"
  value       = aws_iam_role.actions.name
}

output "oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC identity provider"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "trust_condition_sub" {
  description = "Exact OIDC sub claim the role trusts (repo:<owner>/<repo>:environment:<env>)"
  value       = "repo:${var.github_repository}:environment:${var.github_environment}"
}
