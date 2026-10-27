# Phase 3.2 Frontend hosting 모듈: Private S3 + CloudFront(OAC) + SPA Function.
# - S3 는 정적 Website Hosting 을 쓰지 않고 OAC 로만 읽힌다 (Private bucket).
# - Backend origin 은 기존 ALB 전용 호스트(alb_origin_hostname)를 https_only 로 참조한다.
#   Host = SNI = ACM SAN = ALB rule host 이 한 호스트로 일치하므로 CloudFront->ALB
#   순환/TLS 불일치가 없다 (team02-app 자체는 origin 으로 참조하지 않는다).
# - Lambda@Edge 는 사용하지 않는다 (SPA fallback = CloudFront Functions viewer-request).

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  bucket_name = var.s3_bucket_name != "" ? var.s3_bucket_name : "${local.name_prefix}-frontend"

  # AWS 문서에 고정으로 명시된 CloudFront alias 용 Route53 hosted zone id.
  cloudfront_route53_zone_id = "Z2FDTNDATAQYW2"
}

# AWS 가 관리하는 policy 는 ID 하드코딩 대신 이름 조회로 참조한다.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Host 헤더를 forward 하지 않는다 -> CloudFront 가 origin domain(alb_origin_hostname)을
# Host/SNI 로 사용. AllViewer 였으면 viewer 의 team02-app Host 가 그대로 전달되어
# ALB rule 에 매칭되지 않는다.
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

# (S3 origin 용 별도 Origin Request Policy 는 두지 않는다: "Managed-S3" 라는
# managed policy 는 존재하지 않는다. Default behavior 는 Managed-CachingOptimized
# cache policy 를 쓰고 compress=true 이면 Accept-Encoding 은 CloudFront 가
# cache policy 와 함께 자동 처리한다.)

# --- Private S3 --------------------------------------------------------------

resource "aws_s3_bucket" "frontend" {
  bucket = local.bucket_name

  tags = {
    Name  = local.bucket_name
    Parts = "frontend-static Phase3.2"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # SSE-S3
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}


resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name_prefix}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  publish = true
  comment = "Phase 3.2: extension-less SPA paths -> /index.html (S3 default behavior only)"

  code = file("${path.module}/spa_rewrite.js")
}


resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${local.name_prefix}-frontend-oac"
  description                       = "OAC for DevFlow frontend static bucket (Phase 3.2)"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2"
  comment             = "${local.name_prefix} frontend (S3 + ALB backend origin)"
  price_class         = var.price_class
  default_root_object = "index.html"

  aliases = [var.application_domain]

  viewer_certificate {
    cloudfront_default_certificate = false
    acm_certificate_arn            = var.cloudfront_acm_certificate_arn
    ssl_support_method             = "sni-only"
    minimum_protocol_version       = "TLSv1.2_2021"
  }

  # Origin 1: Private S3 (OAC). provider v6: origin.origin_access_control_id
  # (s3_origin_config.origin_access_control_id 는 deprecated)
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Origin 2: 기존 ALB (전용 호스트, https_only)
  origin {
    domain_name = var.alb_origin_hostname
    origin_id   = "alb-backend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https_only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default: SPA/정적 자산. Function 연결은 이 behavior 만.
  default_cache_behavior {
    target_origin_id       = "s3-frontend"
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-http-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    # origin_request_policy_id 미지정 (위 주석 참조: Managed-S3 는 존재하지 않음)

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  # Backend API: 캐싱 없음, 원본 상태코드 유지(401/403/404), Method/Cookie/Query 전부 전달.
  # 두 behavior가 필요한 이유: CloudFront path pattern "/api/*" 는 "/api/" prefix
  # 기준이어서 "/api" 단독 요청은 매칭되지 않고 default(S3, SPA fallback)로 빠진다.
  # 기존 Ingress pathType Prefix("/api")는 "/api" 도 backend 로 전달하므로 동일
  # 동작을 유지하려면 "/api" behavior 가 별도로 필요하다.
  ordered_cache_behavior {
    path_pattern             = "/api"
    target_origin_id         = "alb-backend"
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-http-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "alb-backend"
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-http-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  # Health: 기존 Ingress Prefix 동작 보존 (healthApi.ts 가 /actuator/health 직접 호출)
  ordered_cache_behavior {
    path_pattern             = "/actuator/health"
    target_origin_id         = "alb-backend"
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-http-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  # OAuth 시작/콜백: Spring 세션(JSESSIONID) + state/nonce query 보존 -> 캐싱 금지.
  ordered_cache_behavior {
    path_pattern             = "/oauth2/*"
    target_origin_id         = "alb-backend"
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-http-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  ordered_cache_behavior {
    path_pattern             = "/login/oauth2/*"
    target_origin_id         = "alb-backend"
    cached_methods           = ["GET", "HEAD"]
    viewer_protocol_policy   = "redirect-http-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name  = "${local.name_prefix}-frontend"
    Parts = "frontend-cloudfront Phase3.2"
  }
}

# Bucket policy: CloudFront(OAC) 읽기 전용. distribution ARN 으로 위조 요청 차단.
# (OAC 전용으로는 요청 주체가 CloudFront 라는 것까지 검증되지 않으므로 SourceArn 조건 필수)
resource "aws_s3_bucket_policy" "frontend_cloudfront_read" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}
