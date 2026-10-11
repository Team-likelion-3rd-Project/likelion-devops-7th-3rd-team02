# ExternalDNS IAM 모듈 출력값
# role_arn 은 ServiceAccount annotation 에 그대로 넣는 값이다.

output "role_arn" {
  description = "IAM Role ARN for ExternalDNS (used in ServiceAccount annotation eks.amazonaws.com/role-arn)"
  value       = aws_iam_role.external_dns.arn
}

output "role_name" {
  description = "IAM Role name for ExternalDNS"
  value       = aws_iam_role.external_dns.name
}

output "policy_arn" {
  description = "IAM Policy ARN of the ExternalDNS Route53 least-privilege policy (scoped to manoit.co.kr hosted zone)"
  value       = aws_iam_policy.external_dns.arn
}

output "policy_name" {
  description = "IAM Policy name for ExternalDNS"
  value       = aws_iam_policy.external_dns.name
}
