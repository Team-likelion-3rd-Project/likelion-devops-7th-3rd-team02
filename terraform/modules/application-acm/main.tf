# Application ACM 모듈: team02-app.manoit.co.kr 용 HTTPS 인증서(DNS 검증)
# 발급된 인증서는 Ingress 의 LBC certificate discovery 가 자동으로 찾아 쓴다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  acm_certificate_name = "${var.project_name}-${var.environment}-application-acm-${replace(var.domain_name, ".", "-")}"
}

# --- ACM 인증서 (ap-northeast-1, DNS 검증) -----------------------------------
resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  subject_alternative_names = []
  validation_method         = "DNS"
  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name    = local.acm_certificate_name
    Domain  = var.domain_name
    Purpose = "Application HTTPS team02-app.manoit.co.kr used by ALB Controller Ingress"
  })
}

# --- 검증용 DNS 레코드 --------------------------------------------------------
resource "aws_route53_record" "validation" {
  for_each = {
    for option in aws_acm_certificate.this.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      type   = option.resource_record_type
      record = option.resource_record_value
    }
  }

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = var.route53_record_ttl
  records = [each.value.record]

  # 여기서 만드는 것은 Application 검증용 CNAME 뿐이다. GitLab A 레코드
  # (main.tf 의 aws_route53_record.gitlab)와는 이름이 겹치지 않는다.
}

# --- 인증서 검증 완료 대기 ----------------------------------------------------
resource "aws_acm_certificate_validation" "this" {
  certificate_arn = aws_acm_certificate.this.arn

  # 위에서 만든 CNAME 이 전파되면 검증이 완료된다.
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]
}
