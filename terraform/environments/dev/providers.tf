# AWS Provider 설정. 모든 리소스에 공통 태그를 자동으로 붙인다.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
