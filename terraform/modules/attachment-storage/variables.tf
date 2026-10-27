# 첨부파일 S3 버킷 모듈 입력 변수

variable "project_name" {
  description = "Project name used for resource naming and tagging"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. dev)"
  type        = string
}

variable "abort_incomplete_multipart_upload_days" {
  description = "Days after which incomplete multipart uploads are removed"
  type        = number
  default     = 7
}

variable "noncurrent_version_expiration_days" {
  description = "Days after which noncurrent (overwritten or deleted) object versions are removed"
  type        = number
  default     = 30
}
