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

# (ALB 용 ap-northeast-1 application_acm 과는 별개의 인증서를 이 alias 로 발급한다.)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
