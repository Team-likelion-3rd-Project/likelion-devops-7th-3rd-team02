import type { AxiosProgressEvent } from 'axios'

import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Attachment, AttachmentDownload } from '../types/attachment'

const base = (projectId: number | string, taskId: number | string) =>
  `/projects/${projectId}/tasks/${taskId}/attachments`

// A1 목록 (올린 순)
export const getAttachments = (projectId: number | string, taskId: number | string) =>
  api.get<ApiResponse<Attachment[]>>(base(projectId, taskId))

// A2 업로드: 파트 이름 file 하나.
// 공통 인스턴스의 기본 Content-Type(application/json)이 남아 있으면 axios가 FormData를 JSON으로 바꿔 보내므로,
// multipart로 지정해 브라우저가 boundary를 붙이게 한다.
export const uploadAttachment = (
  projectId: number | string,
  taskId: number | string,
  file: File,
  onUploadProgress?: (event: AxiosProgressEvent) => void,
) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<ApiResponse<Attachment>>(base(projectId, taskId), form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

// A3 다운로드 주소. 누를 때마다 새로 받는다 (5분 유효, 저장하지 않음)
export const getAttachmentDownload = (
  projectId: number | string,
  taskId: number | string,
  attachmentId: number,
) => api.get<ApiResponse<AttachmentDownload>>(`${base(projectId, taskId)}/${attachmentId}/download`)

// A4 삭제: 올린 사람 또는 OWNER
export const deleteAttachment = (
  projectId: number | string,
  taskId: number | string,
  attachmentId: number,
) => api.delete<ApiResponse<null>>(`${base(projectId, taskId)}/${attachmentId}`)
