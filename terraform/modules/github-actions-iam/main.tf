locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  iam_role_name   = "${var.project_name}-${var.environment}-github-actions-role"
  iam_policy_name = "${var.project_name}-${var.environment}-github-actions-frontend-deploy-policy"
  oidc_issuer     = replace(var.github_oidc_url, "https://", "")
}

data "tls_certificate" "github" {
  url = var.github_oidc_url
}

data "aws_iam_openid_connect_provider" "github" {
  url = var.github_oidc_url
}

resource "aws_iam_role" "actions" {
  name = local.iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Federated = data.aws_iam_openid_connect_provider.github.arn
      }

      Action = "sts:AssumeRoleWithWebIdentity"

      Condition = {
        StringEquals = {
          "${local.oidc_issuer}:aud" = "sts.amazonaws.com"
          "${local.oidc_issuer}:sub" = "repo:Team-likelion-3rd-Project@336729042/likelion-devops-7th-3rd-team02@1400844031:environment:${var.github_environment}"
        }
      }
    }]
  })

  tags = merge(local.common_tags, {
    Name = local.iam_role_name
  })
}

data "aws_caller_identity" "current" {}

resource "aws_iam_role_policy" "frontend_deploy" {
  name = local.iam_policy_name
  role = aws_iam_role.actions.name

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid      = "FrontendBucketObjects"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${var.s3_bucket_arn}/*"
      },
      {
        Sid      = "FrontendBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = var.s3_bucket_arn
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"

        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation"
        ]

        Resource = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.cloudfront_distribution_id}"
      }
    ]
  })
}
