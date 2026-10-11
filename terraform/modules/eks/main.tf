# EKS 모듈: 클러스터, IAM Role, OIDC Provider, Managed Node Group, 기본 Add-on
# API 엔드포인트는 Private 전용이라 VPC 내부(GitLab Runner 등)에서만 접근 가능하다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  cluster_name = "${var.project_name}-${var.environment}-eks"
}

# --- EKS Cluster IAM Role -------------------------------------------------
# EKS 컨트롤 플레인이 사용하는 Role
resource "aws_iam_role" "eks_cluster" {
  name = "${local.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
      Action    = ["sts:AssumeRole"]
    }]
  })

  tags = merge(local.common_tags, { Name = "${local.cluster_name}-cluster-role" })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_AmazonEKSClusterPolicy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# --- EKS Node IAM Role ---------------------------------------------------
# Worker Node(EC2)가 사용하는 Role. ECR 은 Pull 전용 권한만 부여한다.
resource "aws_iam_role" "eks_node" {
  name = "${local.cluster_name}-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = ["sts:AssumeRole"]
    }]
  })

  tags = merge(local.common_tags, { Name = "${local.cluster_name}-node-role" })
}

resource "aws_iam_role_policy_attachment" "eks_node_AmazonEKSWorkerNodePolicy" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_node_AmazonEC2ContainerRegistryPullOnly" {
  role       = aws_iam_role.eks_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
}

# --- EKS Cluster ---------------------------------------------------------
resource "aws_eks_cluster" "main" {
  name     = local.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.kubernetes_version

  # Access Entry 방식 사용 (레거시 aws-auth ConfigMap 에 의존하지 않음)
  access_config {
    authentication_mode = "API_AND_CONFIG_MAP"
  }

  enabled_cluster_log_types = var.enabled_cluster_log_types

  upgrade_policy {
    support_type = "STANDARD"
  }

  # Private 엔드포인트만 사용 (외부 인터넷에서 API 접근 불가)
  vpc_config {
    subnet_ids              = var.private_app_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = false
  }

  tags = merge(local.common_tags, { Name = local.cluster_name })

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_AmazonEKSClusterPolicy]
}

# GitLab Runner 가 Private API 엔드포인트(443)에 접근할 수 있도록 허용
resource "aws_vpc_security_group_ingress_rule" "eks_api_from_gitlab" {
  security_group_id = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id

  referenced_security_group_id = var.gitlab_security_group_id

  ip_protocol = "tcp"
  from_port   = 443
  to_port     = 443

  description = "Allow GitLab Runner to access EKS private API endpoint"
}

# GitLab Runner IAM Role 을 EKS 사용자로 등록 (조회 권한만)
resource "aws_eks_access_entry" "gitlab_runner" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.gitlab_runner_role_arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "gitlab_runner_view" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = var.gitlab_runner_role_arn

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [
    aws_eks_access_entry.gitlab_runner
  ]
}

# --- EKS OIDC Provider ---------------------------------------------------
# IRSA(ServiceAccount 단위 IAM 권한)의 기반. OIDC issuer 인증서에서 지문을 얻는다.
data "tls_certificate" "eks_oidc" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer

  depends_on = [aws_eks_cluster.main]
}

resource "aws_iam_openid_connect_provider" "eks" {
  url = data.tls_certificate.eks_oidc.url

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [data.tls_certificate.eks_oidc.certificates[0].sha1_fingerprint]
}

# --- VPC CNI 전용 IAM Role -----------------------------------------------
# kube-system/aws-node ServiceAccount 에만 연결한다(Node Role 오염 방지).
resource "aws_iam_role" "vpc_cni" {
  name = "${local.cluster_name}-vpc-cni-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [{
      Effect = "Allow"

      Principal = {
        Federated = aws_iam_openid_connect_provider.eks.arn
      }

      Action = "sts:AssumeRoleWithWebIdentity"

      Condition = {
        StringEquals = {
          "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
          "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "vpc_cni_AmazonEKS_CNI_Policy" {
  role       = aws_iam_role.vpc_cni.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

# --- Launch Template -----------------------------------------------------
# Node 에 DevFlow EKS Node SG 가 반드시 붙도록 강제한다.
resource "aws_launch_template" "eks_node" {
  name        = "${local.cluster_name}-node-lt"
  description = "Launch template for EKS managed node group ensuring required SG relationship"

  vpc_security_group_ids = [
    var.eks_node_security_group_id,
    aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  ]

  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.common_tags, { Name = "${local.cluster_name}-node-lt-instance" })
  }

  # SSH 키 없음(22 포트 미개방). AL2023 EKS 최적화 AMI 가 부트스트랩을 자동
  # 처리하므로 user_data 도 설정하지 않는다.

  tags = merge(local.common_tags, { Name = "${local.cluster_name}-node-lt" })
}

# --- Managed Node Group --------------------------------------------------
# Private App Subnet 에 배치. 기본 2대, 최대 4대.
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.private_app_subnet_ids

  version        = var.kubernetes_version
  ami_type       = "AL2023_x86_64_STANDARD"
  capacity_type  = "ON_DEMAND"
  instance_types = [var.node_instance_type]

  scaling_config {
    min_size     = var.node_min_size
    desired_size = var.node_desired_size
    max_size     = var.node_max_size
  }

  launch_template {
    id      = aws_launch_template.eks_node.id
    version = aws_launch_template.eks_node.latest_version
  }

  update_config {
    max_unavailable_percentage = 50
  }

  tags = merge(local.common_tags, { Name = "${local.cluster_name}-node-group" })

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.eks_node_AmazonEC2ContainerRegistryPullOnly,
    aws_eks_addon.vpc_cni
  ]
}

# --- EKS 관리형 Add-on ---------------------------------------------------
# vpc-cni 는 Node 생성 전에, coredns/kube-proxy 는 Node 생성 후에 설치된다.
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"

  # 위에서 만든 전용 IAM Role 을 ServiceAccount 단위로 연결
  service_account_role_arn = aws_iam_role.vpc_cni.arn

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [
    aws_iam_role_policy_attachment.vpc_cni_AmazonEKS_CNI_Policy
  ]
}

resource "aws_eks_addon" "coredns" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "coredns"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.main]
}

resource "aws_eks_addon" "kube_proxy" {
  cluster_name                = aws_eks_cluster.main.name
  addon_name                  = "kube-proxy"
  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  depends_on = [aws_eks_node_group.main]
}
