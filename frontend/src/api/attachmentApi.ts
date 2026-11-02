import api from './axios'
import type { ApiResponse } from '../types/api'
import type { TaskAttachment } from '../types/attachment'

const attachmentUrl = (projectId: number | string, taskId: number | string) =>
  `/projects/${projectId}/tasks/${taskId}/attachments`

export const getAttachments = (projectId: number | string, taskId: number | string) =>
  api.get<ApiResponse<TaskAttachment[]>>(attachmentUrl(projectId, taskId))

export const uploadAttachment = (projectId: number | string, taskId: number | string, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<ApiResponse<TaskAttachment>>(attachmentUrl(projectId, taskId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const fetchAttachmentContent = (
  projectId: number | string,
  taskId: number | string,
  attachmentId: number | string,
) => api.get<Blob>(`${attachmentUrl(projectId, taskId)}/${attachmentId}`, { responseType: 'blob' })

export const deleteAttachment = (
  projectId: number | string,
  taskId: number | string,
  attachmentId: number | string,
) => api.delete<ApiResponse<null>>(`${attachmentUrl(projectId, taskId)}/${attachmentId}`)
