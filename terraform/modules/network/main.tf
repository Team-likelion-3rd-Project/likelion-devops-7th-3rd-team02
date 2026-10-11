# Network 모듈: VPC, Subnet(3계층), IGW/NAT, Route Table 구성

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  eks_cluster_name_tag = var.eks_cluster_name != "" ? var.eks_cluster_name : var.project_name
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc"
  })
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-igw"
  })
}

# NAT Gateway 용 고정 공인 IP
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat-eip"
  })
}

# Private Subnet 의 아웃바운드 인터넷 경로 (단일 NAT)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-nat"
  })

  depends_on = [aws_internet_gateway.main]
}

# Public Subnet: ALB 배치용.
# kubernetes.io/role/elb 태그로 LBC 가 인터넷 향 ALB 서브넷을 자동 탐색한다.
resource "aws_subnet" "public" {
  count = length(var.azs)

  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  vpc_id            = aws_vpc.main.id

  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name                                                  = "${var.project_name}-${var.environment}-public-${count.index + 1}-${var.azs[count.index]}"
    "kubernetes.io/role/elb"                              = "1"
    "kubernetes.io/cluster/${local.eks_cluster_name_tag}" = "owned"
  })
}

# Private App Subnet: EKS Node 배치용 (internal-elb 태그)
resource "aws_subnet" "private_app" {
  count = length(var.azs)

  cidr_block        = var.private_app_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  vpc_id            = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name                                                  = "${var.project_name}-${var.environment}-private-app-${count.index + 1}-${var.azs[count.index]}"
    "kubernetes.io/role/internal-elb"                     = "1"
    "kubernetes.io/cluster/${local.eks_cluster_name_tag}" = "owned"
  })
}

# Private DB Subnet: RDS 전용 (라우팅 테이블 미연결 = 완전 격리)
resource "aws_subnet" "private_db" {
  count = length(var.azs)

  cidr_block        = var.private_db_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  vpc_id            = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-db-${count.index + 1}-${var.azs[count.index]}"
  })
}

# Public 라우팅: 인터넷 게이트웨이로 나간다
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-route-public"
  })
}

# Private App 라우팅: NAT 를 통해서만 아웃바운드
resource "aws_route_table" "private_app" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-route-private-app"
  })
}

# Subnet - Route Table 연결
resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public[0].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public[1].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private_app_a" {
  subnet_id      = aws_subnet.private_app[0].id
  route_table_id = aws_route_table.private_app.id
}

resource "aws_route_table_association" "private_app_b" {
  subnet_id      = aws_subnet.private_app[1].id
  route_table_id = aws_route_table.private_app.id
}
