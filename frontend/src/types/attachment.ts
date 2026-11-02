export interface TaskAttachment {
  id: number
  taskId: number
  fileName: string
  contentType: string
  size: number
  uploaderId: number
  uploaderName: string
  createdAt: string
}
