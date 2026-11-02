# 첨부파일 S3 버킷 모듈 (사용자 업로드 파일)
# - 퍼블릭 접근을 막고 SSE-S3 로 암호화한다.
# - Backend 가 IAM Role(IRSA)로 접근한다. Role 은 이 모듈 밖에서 만들고 bucket ARN 출력값을 쓴다.
# - 업로드는 Backend API 를 거치므로 CORS 는 두지 않는다 (docs/architecture.md 파일 업로드 흐름).
# - Frontend 정적 파일 버킷은 frontend-hosting 모듈이 만든다.

data "aws_caller_identity" "current" {}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # S3 버킷 이름은 전 세계에서 하나만 쓸 수 있어 계정 ID 를 붙인다.
  bucket_name = "${var.project_name}-${var.environment}-attachment-${data.aws_caller_identity.current.account_id}"

  iam_role_name   = "${var.project_name}-${var.environment}-backend-attachments-role"
  iam_policy_name = "${var.project_name}-${var.environment}-backend-attachments-policy"
}

# 사용자 데이터라 객체가 남아 있으면 삭제되지 않게 둔다 (force_destroy = false).
resource "aws_s3_bucket" "attachment" {
  bucket        = local.bucket_name
  force_destroy = false

  tags = merge(local.common_tags, {
    Name    = local.bucket_name
    Purpose = "User attachment files accessed by Backend through IAM role"
  })
}

resource "aws_s3_bucket_ownership_controls" "attachment" {
  bucket = aws_s3_bucket.attachment.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "attachment" {
  bucket = aws_s3_bucket.attachment.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachment" {
  bucket = aws_s3_bucket.attachment.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "attachment" {
  bucket = aws_s3_bucket.attachment.id

  rule {
    id     = "abort-incomplete-multipart-upload"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = var.abort_incomplete_multipart_upload_days
    }
  }
}

resource "aws_iam_policy" "backend_attachments" {
  name        = local.iam_policy_name
  description = "Least-privilege S3 object access for DevFlow Backend attachment upload, download and delete"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.attachment.arn}/*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = local.iam_policy_name
  })
}

resource "aws_iam_role" "backend_attachments" {
  name = local.iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Federated = var.oidc_provider_arn
      }

      Action = "sts:AssumeRoleWithWebIdentity"

      Condition = {
        StringEquals = {
          "${replace(var.oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:${var.backend_namespace}:${var.backend_service_account}"
          "${replace(var.oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(local.common_tags, {
    Name = local.iam_role_name
  })
}

resource "aws_iam_role_policy_attachment" "backend_attachments" {
  role       = aws_iam_role.backend_attachments.name
  policy_arn = aws_iam_policy.backend_attachments.arn
}
