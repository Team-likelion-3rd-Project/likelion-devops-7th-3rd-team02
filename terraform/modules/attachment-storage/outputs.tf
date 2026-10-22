# 첨부파일 S3 버킷 모듈 출력값
# ARN 은 Backend IRSA 정책의 Resource 로, 이름은 Backend 설정(ConfigMap)에 쓴다.

output "bucket_name" {
  description = "Attachment files bucket name (Backend configuration)"
  value       = aws_s3_bucket.attachment.id
}

output "bucket_arn" {
  description = "Attachment files bucket ARN (Backend IRSA policy resource)"
  value       = aws_s3_bucket.attachment.arn
}

output "bucket_regional_domain_name" {
  description = "Attachment bucket regional domain name"
  value       = aws_s3_bucket.attachment.bucket_regional_domain_name
}
