# AWS Load Balancer Controller 용 IAM 모듈 (IRSA)
# 이 Role ARN 을 kube-system/aws-load-balancer-controller ServiceAccount 의
# eks.amazonaws.com/role-arn annotation 에 넣어 사용한다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  iam_role_name   = "${var.project_name}-${var.environment}-aws-load-balancer-controller-role"
  iam_policy_name = "${var.project_name}-${var.environment}-aws-load-balancer-controller-policy"
}

# --- IAM Policy: 공식 v2.14.1 정책 파일(iam_policy.json)을 그대로 사용 -------
resource "aws_iam_policy" "alb_controller" {
  name        = local.iam_policy_name
  description = "IAM policy for AWS Load Balancer Controller (v2.14.1, official upstream policy)"

  policy = file("${path.module}/iam_policy.json")

  tags = merge(local.common_tags, { Name = local.iam_policy_name })
}

# --- IAM Role: EKS OIDC Provider 를 신뢰하며, 지정한 ServiceAccount 만 허용 --
resource "aws_iam_role" "alb_controller" {
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
          "${replace(var.oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          "${replace(var.oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(local.common_tags, { Name = local.iam_role_name })
}

# --- Role 에 Policy 연결 -----------------------------------------------------
resource "aws_iam_role_policy_attachment" "alb_controller" {
  role       = aws_iam_role.alb_controller.name
  policy_arn = aws_iam_policy.alb_controller.arn
}
