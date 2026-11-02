import { useState } from 'react'

import {
  deleteAttachment,
  getAttachments,
  uploadAttachment,
} from '../api/attachmentApi'
import { useAsyncData } from './useAsyncData'
import { getErrorMessage } from '../utils/error'
import type { TaskAttachment } from '../types/attachment'

export function useTaskAttachments(projectId: number, taskId: number) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const list = useAsyncData(
    () => getAttachments(projectId, taskId).then((response) => response.data.data),
    `attachments-${projectId}-${taskId}`,
    '첨부파일을 불러오지 못했습니다.',
  )

  const upload = async (file: File): Promise<boolean> => {
    setBusy(true)
    setActionError('')
    try {
      await uploadAttachment(projectId, taskId, file)
      list.reload()
      return true
    } catch (error) {
      setActionError(getErrorMessage(error, '업로드에 실패했습니다.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const remove = async (attachmentId: number): Promise<boolean> => {
    setBusy(true)
    setActionError('')
    try {
      await deleteAttachment(projectId, taskId, attachmentId)
      list.reload()
      return true
    } catch (error) {
      setActionError(getErrorMessage(error, '삭제에 실패했습니다.'))
      return false
    } finally {
      setBusy(false)
    }
  }

  const attachments: TaskAttachment[] = list.data ?? []

  return {
    attachments,
    isLoading: list.isLoading,
    error: list.error,
    reload: list.reload,
    busy,
    actionError,
    upload,
    remove,
  }
}
