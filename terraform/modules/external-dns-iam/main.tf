# ExternalDNS 용 IAM 모듈 (IRSA)
# 이 Role ARN 을 external-dns/external-dns ServiceAccount 의
# eks.amazonaws.com/role-arn annotation 에 넣어 사용한다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  iam_role_name   = "${var.project_name}-${var.environment}-external-dns-role"
  iam_policy_name = "${var.project_name}-${var.environment}-external-dns-policy"
}

# --- IAM Policy: Route53 최소 권한 -------------------------------------------
# 레코드 변경은 team02-app.manoit.co.kr 이름으로만 제한한다.
# 주의: ExternalDNS 가 TXT registry 레코드를 "a-team02-app..." 같은 파생 이름으로
# 만들면 이 조건에 걸려 AccessDenied 가 날 수 있다(배포 후 확인 필요).
resource "aws_iam_policy" "external_dns" {
  name        = local.iam_policy_name
  description = "Least-privilege IAM policy for Kubernetes ExternalDNS to manage team02-app.manoit.co.kr in Route53"

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "route53:ChangeResourceRecordSets"
        ]

        Resource = "arn:aws:route53:::hostedzone/${var.hosted_zone_id}"

        Condition = {
          "ForAllValues:StringEquals" = {
            "route53:ChangeResourceRecordSetsNormalizedRecordNames" = [
              "team02-app.manoit.co.kr",
              "aaaa-team02-app.manoit.co.kr",
              "cname-team02-app.manoit.co.kr"
            ]
          }
        }
      },
      {
        Effect = "Allow"

        Action = [
          "route53:ListResourceRecordSets",
          "route53:ListTagsForResources"
        ]

        Resource = "arn:aws:route53:::hostedzone/${var.hosted_zone_id}"
      },
      {
        Effect = "Allow"

        Action = [
          "route53:ListHostedZones"
        ]

        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = local.iam_policy_name
  })
}

# --- IAM Role: EKS OIDC Provider 를 신뢰하며, 지정한 ServiceAccount 만 허용 --
resource "aws_iam_role" "external_dns" {
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
          "${replace(var.oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:external-dns:external-dns"
          "${replace(var.oidc_issuer_url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = merge(local.common_tags, {
    Name = local.iam_role_name
  })
}

# --- Role 에 Policy 연결 -----------------------------------------------------
resource "aws_iam_role_policy_attachment" "external_dns" {
  role       = aws_iam_role.external_dns.name
  policy_arn = aws_iam_policy.external_dns.arn
}
