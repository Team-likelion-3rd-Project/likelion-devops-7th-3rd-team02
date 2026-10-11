# RDS 모듈: PostgreSQL 단일 인스턴스 (Private DB Subnet, 외부 접근 차단)

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  db_instance_identifier = "${var.project_name}-${var.environment}-db"
  db_subnet_group_name   = "${var.project_name}-${var.environment}-db-subnet-group"
}

# RDS 를 배치할 Private DB Subnet 그룹
resource "aws_db_subnet_group" "rds" {
  name       = local.db_subnet_group_name
  subnet_ids = var.subnet_ids

  tags = merge(local.common_tags, {
    Name = local.db_subnet_group_name
  })
}

# publicly_accessible = false, 스토리지 암호화, 백업 7일 보관
resource "aws_db_instance" "rds" {
  identifier          = local.db_instance_identifier
  engine              = var.engine
  engine_version      = var.engine_version
  instance_class      = var.instance_class
  allocated_storage   = var.allocated_storage
  db_name             = var.db_name
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = true

  db_subnet_group_name   = aws_db_subnet_group.rds.name
  vpc_security_group_ids = [var.security_group_id]

  multi_az                = var.multi_az
  publicly_accessible     = false
  storage_encrypted       = true
  backup_retention_period = 7

  tags = merge(local.common_tags, {
    Name = local.db_instance_identifier
  })
}

# endpoint 는 "host:5432" 형식이다. Backend 의 DB_URL 에 넣을 때 포트를 중복해서
# 붙이지 않도록 주의한다.
output "endpoint" {
  description = "RDS endpoint"
  value       = aws_db_instance.rds.endpoint
}

output "port" {
  description = "RDS port"
  value       = aws_db_instance.rds.port
}

output "database_name" {
  description = "RDS database name"
  value       = aws_db_instance.rds.db_name
}

output "db_subnet_group_name" {
  description = "RDS DB subnet group name"
  value       = aws_db_subnet_group.rds.name
}
