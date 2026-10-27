# frontend-hosting 모듈 출력값

output "s3_bucket_id" {
  description = "Frontend static bucket name (s3:// target of CI sync)."
  value       = aws_s3_bucket.frontend.id
}

output "s3_bucket_arn" {
  description = "Frontend static bucket ARN (IAM policy scope)."
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (CI invalidation target)."
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain (alias target for the DNS cutover record)."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_hosted_zone_id" {
  description = "Route53 alias zone id to use when aliasing to this distribution (AWS-documented constant)."
  value       = local.cloudfront_route53_zone_id
}

output "origin_access_control_id" {
  description = "OAC id attached to the S3 origin."
  value       = aws_cloudfront_origin_access_control.s3.id
}

output "spa_rewrite_function_arn" {
  description = "ARN of the viewer-request SPA rewrite function (attached to the S3 default behavior only)."
  value       = aws_cloudfront_function.spa_rewrite.arn
}
