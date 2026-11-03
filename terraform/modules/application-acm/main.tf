# Application ACM 모듈: 단일 도메인용 HTTPS 인증서(DNS 검증)
# 발급된 인증서는 Ingress 의 LBC certificate discovery 가 자동으로 찾아 쓴다.
#
# DNS 검증 CNAME 소유 규칙: 동일 계정·동일 FQDN의 ACM DNS 검증 CNAME 은 발급 리전과
# 무관하게 동일하므로(name/value 결정적), FQDN당 record 생성은 호출 1회
# (create_validation_records=true)에서만 수행한다. 나머지 호출(us-east-1 CloudFront viewer)은
# create_validation_records=false + external_validation_record_fqdns 로 기존 CNAME 을
# 재사용한다. 중복 생성은 Route53 "already exists" 로 Apply 를 실패시키며,
# allow_overwrite 로 우회하지 않는다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  acm_certificate_name = "${var.project_name}-${var.environment}-application-acm-${replace(var.domain_name, ".", "-")}"

  # false 면 빈 map 이 되어 aws_route53_record.validation 이 0개 생성된다.
  validation_records = var.create_validation_records ? {
    for option in aws_acm_certificate.this.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      type   = option.resource_record_type
      record = option.resource_record_value
    }
  } : {}
}

# --- ACM 인증서 (인증서 자체는 호출 측 provider의 리전에서 발급) ----------------
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
    Purpose = "Application HTTPS for ${var.domain_name} used by ALB Controller Ingress / CloudFront viewer"
  })
}

# --- 검증용 DNS 레코드 (create_validation_records=true 인 호출만 생성) ----------
resource "aws_route53_record" "validation" {
  for_each = local.validation_records

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = var.route53_record_ttl
  records = [each.value.record]

  # 이 모듈이 만드는 것은 Application 검증용 CNAME 뿐이다. apex A alias
  # (main.tf 의 aws_route53_record.frontend)와는 이름이 겹치지 않는다.
}

# --- 인증서 검증 완료 대기 ----------------------------------------------------
# 직접 생성한 레코드가 없는 호출은 external_validation_record_fqdns(동일 FQDN의
# 단일 owner 가 만든 CNAME) 에 의존해 검증을 대기한다.
resource "aws_acm_certificate_validation" "this" {
  certificate_arn = aws_acm_certificate.this.arn

  validation_record_fqdns = var.create_validation_records ? [for r in aws_route53_record.validation : r.fqdn] : var.external_validation_record_fqdns
}
