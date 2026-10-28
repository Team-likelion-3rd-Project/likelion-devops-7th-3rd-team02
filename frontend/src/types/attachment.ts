// 업무 첨부파일 (Wiki "Backend API 구현 목록" 15장 A1~A4, Backend #62)

export interface Attachment {
  id: number
  taskId: number
  fileName: string
  contentType: string
  // 바이트
  size: number
  uploaderId: number
  uploaderName: string
  createdAt: string
}

// A3: 5분 유효. AWS는 S3 presigned URL(다른 도메인), 로컬·온프렘은 /api/attachments/files/{토큰}
export interface AttachmentDownload {
  url: string
  expiresAt: string
}

// Backend 제한 (15.1): 파일당 10MB, 업무당 20개
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_MAX_PER_TASK = 20
