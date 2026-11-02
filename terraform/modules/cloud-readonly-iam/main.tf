data "aws_caller_identity" "current" {}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  role_name           = "${var.project_name}-${var.environment}-cloud-readonly-role"
  policy_name         = "${var.project_name}-${var.environment}-cloud-readonly-policy"
  backend_policy_name = "${var.project_name}-${var.environment}-backend-cloud-assume-policy"
}

resource "aws_iam_role" "cloud_readonly" {
  name = local.role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        AWS = var.backend_irsa_role_arn
      }

      Action = "sts:AssumeRole"

      Condition = {
        StringEquals = {
          "sts:ExternalId" = var.external_id
        }
      }
    }]
  })

  tags = merge(local.common_tags, {
    Name = local.role_name
  })
}

resource "aws_iam_policy" "cloud_readonly" {
  name        = local.policy_name
  description = "Read-only cloud lookups (RDS, ALB, CloudWatch GetMetricData) for DevFlow project cloud integration"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Sid      = "RdsDescribe"
        Effect   = "Allow"
        Action   = ["rds:Describe*"]
        Resource = "*"
      },
      {
        Sid      = "Elbv2Describe"
        Effect   = "Allow"
        Action   = ["elasticloadbalancing:Describe*"]
        Resource = "*"
      },
      {
        Sid      = "CloudWatchMetricData"
        Effect   = "Allow"
        Action   = ["cloudwatch:GetMetricData"]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = local.policy_name
  })
}

resource "aws_iam_role_policy_attachment" "cloud_readonly" {
  role       = aws_iam_role.cloud_readonly.name
  policy_arn = aws_iam_policy.cloud_readonly.arn
}

resource "aws_iam_policy" "backend_assume" {
  name        = local.backend_policy_name
  description = "Scoped sts:AssumeRole for the DevFlow Backend IRSA role to the DevFlow cloud read-only role"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect   = "Allow"
      Action   = "sts:AssumeRole"
      Resource = aws_iam_role.cloud_readonly.arn
    }]
  })

  tags = merge(local.common_tags, {
    Name = local.backend_policy_name
  })
}

resource "aws_iam_role_policy_attachment" "backend_assume" {
  role       = var.backend_irsa_role_name
  policy_arn = aws_iam_policy.backend_assume.arn
}
