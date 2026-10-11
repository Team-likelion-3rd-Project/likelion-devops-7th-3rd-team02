# GitLab 모듈: GitLab 서버용 EC2 와 IAM Role
# 웹/레지스트리 접근은 GitLab ALB 를 통해서만 들어온다.

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  instance_name_tag = "${var.project_name}-${var.environment}-${var.instance_name}"
}

# EC2 인스턴스 Role. dev 환경에서 eks:DescribeCluster 정책이 추가로 붙는다.
resource "aws_iam_role" "gitlab" {
  name = "${local.instance_name_tag}-iam-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_instance_profile" "gitlab" {
  name = "${local.instance_name_tag}-instance-profile"
  role = aws_iam_role.gitlab.name
}

# SSH 키 대신 SSM Session Manager 로 접속하기 위한 정책
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.gitlab.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# GitLab 설치는 user_data.sh.tpl 스크립트가 처리한다.
resource "aws_instance" "gitlab" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  iam_instance_profile        = aws_iam_instance_profile.gitlab.name
  user_data_replace_on_change = false
  user_data = templatefile("${path.module}/user_data.sh.tpl",
    {
      gitlab_hostname = var.gitlab_hostname
  })


  root_block_device {
    volume_size = var.root_volume_size
    volume_type = var.root_volume_type
    encrypted   = true
  }

  tags = merge(local.common_tags, {
    Name = local.instance_name_tag
  })
}

output "instance_id" {
  description = "GitLab EC2 Instance ID"
  value       = aws_instance.gitlab.id
}

output "private_ip" {
  description = "GitLab EC2 Private IP"
  value       = aws_instance.gitlab.private_ip
}

output "public_ip" {
  description = "GitLab EC2 Public IP"
  value       = aws_instance.gitlab.public_ip
}
