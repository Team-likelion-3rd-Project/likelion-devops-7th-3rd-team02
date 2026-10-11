# Application ACM 모듈 출력값
# 현재 Ingress 는 certificate discovery 를 쓰므로 이 ARN 을 YAML 에 넣지 않아도 된다.

output "certificate_arn" {
  description = "ACM Certificate ARN for the application domain (team02-app.manoit.co.kr). Use this in Kubernetes Ingress annotation: alb.ingress.kubernetes.io/certificate-arn"
  value       = aws_acm_certificate.this.arn
}

output "certificate_id" {
  description = "ACM Certificate ID of the application certificate"
  value       = aws_acm_certificate.this.id
}

output "domain_name" {
  description = "Validated domain name covered by this ACM certificate"
  value       = var.domain_name
}

output "validation_record_fqdns" {
  description = "FQDNs of the Route53 records created for DNS validation (set only after validation completes)"
  value       = [for r in aws_route53_record.validation : r.fqdn]
}
