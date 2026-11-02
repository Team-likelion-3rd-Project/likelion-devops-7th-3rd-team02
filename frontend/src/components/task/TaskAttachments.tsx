import { useState, type ChangeEvent } from 'react'
import { Download, FileText, Trash2, Upload } from 'lucide-react'

import { fetchAttachmentContent } from '../../api/attachmentApi'
import { useProjectContext } from '../../hooks/useProjectContext'
import { useTaskAttachments } from '../../hooks/useTaskAttachments'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, focusRing } from '../common/styles'
import { formatRelativeTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import { isProjectOwner } from '../../utils/projectRole'
import type { TaskAttachment } from '../../types/attachment'

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

const iconButtonClass = `flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`

function TaskAttachments({ projectId, taskId }: { projectId: number; taskId: number }) {
  const { currentProject, currentUser } = useProjectContext()
  const { attachments, isLoading, error, reload, busy, actionError, upload, remove } =
    useTaskAttachments(projectId, taskId)
  const [downloadError, setDownloadError] = useState('')

  const canRemove = (attachment: TaskAttachment) =>
    attachment.uploaderId === currentUser?.userId ||
    isProjectOwner(currentProject, currentUser?.userId)

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      setDownloadError('')
      await upload(file)
    }
  }

  const download = async (attachment: TaskAttachment) => {
    setDownloadError('')
    try {
      const response = await fetchAttachmentContent(projectId, taskId, attachment.id)
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setDownloadError(getErrorMessage(err, '다운로드에 실패했습니다.'))
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold">
          첨부파일{attachments.length > 0 ? ` (${attachments.length})` : ''}
        </h3>
        <label
          className={`${buttonClass} cursor-pointer${busy ? ' pointer-events-none opacity-45' : ''}`}
        >
          <Upload size={14} aria-hidden="true" />
          업로드
          <input
            type="file"
            className="hidden"
            onChange={onFileSelected}
            disabled={busy}
          />
        </label>
      </div>

      {actionError && (
        <p role="alert" className="text-[12.5px] text-err">
          {actionError}
        </p>
      )}
      {downloadError && (
        <p role="alert" className="text-[12.5px] text-err">
          {downloadError}
        </p>
      )}
      {busy && (
        <p role="status" className="text-[12.5px] text-muted">
          처리 중…
        </p>
      )}

      {isLoading ? (
        <Loading message="첨부파일을 불러오는 중..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : attachments.length === 0 ? (
        <EmptyState message="첨부파일이 아직 없습니다." />
      ) : (
        <ul className="flex flex-col gap-1">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-line px-2.5 py-2"
            >
              <FileText size={14} className="flex-none text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{attachment.fileName}</p>
                <p className="truncate text-[11.5px] text-muted">
                  {formatSize(attachment.size)} · {attachment.uploaderName} ·{' '}
                  {formatRelativeTime(attachment.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void download(attachment)}
                aria-label={`${attachment.fileName} 다운로드`}
                title="다운로드"
                className={iconButtonClass}
              >
                <Download size={14} aria-hidden="true" />
              </button>
              {canRemove(attachment) && (
                <button
                  type="button"
                  onClick={() => void remove(attachment.id)}
                  disabled={busy}
                  aria-label={`${attachment.fileName} 삭제`}
                  title="삭제"
                  className={`${iconButtonClass} hover:text-err`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TaskAttachments
