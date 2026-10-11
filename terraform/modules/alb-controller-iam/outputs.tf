# ALB Controller IAM 모듈 출력값
# role_arn 은 ServiceAccount annotation 에 그대로 넣는 값이다.

output "role_arn" {
  description = "IAM Role ARN for AWS Load Balancer Controller (used in ServiceAccount annotation eks.amazonaws.com/role-arn)"
  value       = aws_iam_role.alb_controller.arn
}

output "role_name" {
  description = "IAM Role name for AWS Load Balancer Controller"
  value       = aws_iam_role.alb_controller.name
}

output "policy_arn" {
  description = "IAM Policy ARN of the official AWS Load Balancer Controller policy (v2.14.1)"
  value       = aws_iam_policy.alb_controller.arn
}

output "policy_name" {
  description = "IAM Policy name for AWS Load Balancer Controller"
  value       = aws_iam_policy.alb_controller.name
}
