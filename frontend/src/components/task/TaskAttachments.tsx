import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Download, File, FileImage, FileText, Paperclip, Trash2 } from 'lucide-react'

import { ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, dangerButtonClass, focusRing } from '../common/styles'
import {
  deleteAttachment,
  getAttachmentDownload,
  getAttachments,
  uploadAttachment,
} from '../../api/attachmentApi'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatRelativeTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import { formatFileSize } from '../../utils/file'
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_PER_TASK } from '../../types/attachment'
import type { Attachment } from '../../types/attachment'

const iconButtonClass = `flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-md text-muted hover:bg-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`

interface Uploading {
  key: string
  name: string
  percent: number
}

const fileIcon = (contentType: string) => {
  if (contentType.startsWith('image/')) return FileImage
  if (contentType.startsWith('text/') || contentType.includes('pdf') || contentType.includes('json')) {
    return FileText
  }
  return File
}

// 설계서 4.5 업무 상세 패널의 첨부파일 (A1~A4)
// 업로드·삭제는 누르는 즉시 저장되는 동작이라 [취소]·[저장]이 있는 수정 모달이 아닌 상세 패널에 둔다.
// 조회·업로드·다운로드는 팀원 전체, 삭제는 올린 사람 또는 OWNER (Backend 15장).
function TaskAttachments({
  projectId,
  taskId,
  currentUserId,
  isOwner,
}: {
  projectId: number
  taskId: number
  currentUserId: number | undefined
  isOwner: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState<Uploading[]>([])
  const [actionError, setActionError] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const attachments = useAsyncData(
    () => getAttachments(projectId, taskId).then((response) => response.data.data ?? []),
    `attachments-${projectId}-${taskId}`,
    '첨부파일을 불러오지 못했습니다.',
  )

  const list = attachments.data ?? []
  const remaining = ATTACHMENT_MAX_PER_TASK - list.length - uploading.length
  const isFull = remaining <= 0

  // 여러 파일을 고르면 하나씩 차례로 올린다 (A2는 요청 하나에 파일 하나).
  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    setActionError('')

    const tooLarge = files.filter((file) => file.size > ATTACHMENT_MAX_BYTES)
    const sendable = files.filter((file) => file.size <= ATTACHMENT_MAX_BYTES && file.size > 0)
    const accepted = sendable.slice(0, Math.max(0, remaining))

    const notices: string[] = []
    if (tooLarge.length > 0) {
      notices.push(`10MB를 넘는 파일은 올릴 수 없어요: ${tooLarge.map((file) => file.name).join(', ')}`)
    }
    if (files.some((file) => file.size === 0)) notices.push('빈 파일은 올릴 수 없어요.')
    if (accepted.length < sendable.length) {
      notices.push(`업무 하나에 ${ATTACHMENT_MAX_PER_TASK}개까지 올릴 수 있어요.`)
    }

    for (const file of accepted) {
      const key = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`
      setUploading((prev) => [...prev, { key, name: file.name, percent: 0 }])

      try {
        await uploadAttachment(projectId, taskId, file, (event) => {
          const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0
          setUploading((prev) => prev.map((item) => (item.key === key ? { ...item, percent } : item)))
        })
      } catch (error) {
        notices.push(`${file.name}: ${getErrorMessage(error, '파일을 올리지 못했습니다.')}`)
      } finally {
        setUploading((prev) => prev.filter((item) => item.key !== key))
      }
    }

    if (accepted.length > 0) attachments.reload()
    if (notices.length > 0) setActionError(notices.join('\n'))
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    // 같은 파일을 다시 고를 수 있게 비운다.
    event.target.value = ''
    void uploadFiles(files)
  }

  // 끌어다 놓기: 자식 요소를 지날 때 깜빡이지 않게 깊이를 센다.
  const handleDragEnter = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    dragDepth.current += 1
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    if (!isFull) void uploadFiles(Array.from(event.dataTransfer.files))
  }

  // 다운로드 주소는 5분만 유효해서 누를 때마다 새로 받는다. 응답이 attachment라 화면은 그대로 있다.
  const handleDownload = async (attachment: Attachment) => {
    setBusyId(attachment.id)
    setActionError('')

    try {
      const response = await getAttachmentDownload(projectId, taskId, attachment.id)
      window.location.assign(response.data.data.url)
    } catch (error) {
      setActionError(getErrorMessage(error, '다운로드 주소를 받지 못했습니다.'))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    setBusyId(attachment.id)
    setActionError('')

    try {
      await deleteAttachment(projectId, taskId, attachment.id)
      setConfirmingId(null)
    } catch (error) {
      setActionError(getErrorMessage(error, '첨부파일을 삭제하지 못했습니다.'))
    } finally {
      setBusyId(null)
      // 다른 팀원이 먼저 지웠을 수 있어 결과와 관계없이 다시 불러온다.
      attachments.reload()
    }
  }

  const canDelete = (attachment: Attachment) =>
    isOwner || (currentUserId !== undefined && attachment.uploaderId === currentUserId)

  const renderList = () => {
    if (attachments.error) return <ErrorMessage message={attachments.error} onRetry={attachments.reload} />
    if (attachments.isLoading && attachments.data === null) return <Loading message="첨부파일을 불러오는 중입니다." />

    if (list.length === 0 && uploading.length === 0) {
      return (
        <p className="rounded-[10px] border border-dashed border-line px-3.5 py-4 text-center text-[13px] break-keep text-muted">
          첨부한 파일이 없어요. 파일을 끌어다 놓거나 [파일 첨부]로 올려 주세요.
        </p>
      )
    }

    return (
      <ul className="flex flex-col">
        {list.map((attachment) => {
          const Icon = fileIcon(attachment.contentType)
          const isConfirming = confirmingId === attachment.id
          const isBusy = busyId === attachment.id

          return (
            <li key={attachment.id} className="flex flex-col gap-1.5 border-b border-line2 py-2.5 last:border-b-0">
              <div className="flex min-w-0 items-center gap-2">
                <Icon aria-hidden="true" size={16} className="flex-none text-muted" />
                <span title={attachment.fileName} className="min-w-0 flex-1 truncate">
                  {attachment.fileName}
                </span>
                {!isConfirming && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDownload(attachment)}
                      disabled={isBusy}
                      aria-label={`${attachment.fileName} 받기`}
                      title="받기"
                      className={iconButtonClass}
                    >
                      <Download aria-hidden="true" size={15} />
                    </button>
                    {canDelete(attachment) && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionError('')
                          setConfirmingId(attachment.id)
                        }}
                        disabled={isBusy}
                        aria-label={`${attachment.fileName} 삭제`}
                        title="삭제"
                        className={`${iconButtonClass} hover:text-err`}
                      >
                        <Trash2 aria-hidden="true" size={15} />
                      </button>
                    )}
                  </>
                )}
              </div>

              <span className="flex flex-wrap gap-x-2.5 pl-6 text-[12px] text-muted">
                <span>{formatFileSize(attachment.size)}</span>
                <span>{attachment.uploaderName}</span>
                <span>{formatRelativeTime(attachment.createdAt)}</span>
              </span>

              {isConfirming && (
                <div className="flex flex-wrap items-center gap-2 pl-6">
                  <span role="alert" className="mr-auto text-[13px] font-medium text-err">
                    이 파일을 삭제할까요?
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className={`${buttonClass} h-7 px-2.5 text-[13px]`}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(attachment)}
                    disabled={isBusy}
                    className={`${dangerButtonClass} h-7 px-2.5 text-[13px]`}
                  >
                    {isBusy ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              )}
            </li>
          )
        })}

        {uploading.map((item) => (
          <li key={item.key} className="flex flex-col gap-1.5 border-b border-line2 py-2.5 last:border-b-0">
            <div className="flex min-w-0 items-center gap-2">
              <Paperclip aria-hidden="true" size={16} className="flex-none text-muted" />
              <span title={item.name} className="min-w-0 flex-1 truncate text-muted">
                {item.name}
              </span>
              <span className="flex-none text-[12px] text-muted">{item.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`${item.name} 올리는 중`}
              aria-valuenow={item.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="ml-6 h-1 overflow-hidden rounded-full bg-line2"
            >
              <div className="h-full bg-accent transition-[width] motion-reduce:transition-none" style={{ width: `${item.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section
      aria-label="첨부파일"
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault()
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative -mx-2 flex flex-col gap-2.5 rounded-[10px] border border-transparent px-2 py-2 ${
        isDragging ? 'border-dashed border-accent bg-accent-bg' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          첨부파일{list.length > 0 && <span className="ml-1.5 font-normal text-muted">{list.length}</span>}
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isFull}
          title={isFull ? `업무 하나에 ${ATTACHMENT_MAX_PER_TASK}개까지 올릴 수 있어요.` : '10MB 이하 파일'}
          className={`${buttonClass} h-[30px] px-2.5 text-[13px]`}
        >
          <Paperclip aria-hidden="true" size={14} />
          파일 첨부
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={handleInput} />
      </div>

      {isDragging && (
        <p aria-hidden="true" className="text-center text-[13px] font-medium text-accent">
          여기에 놓으면 올려요
        </p>
      )}

      {/* 여러 파일 결과를 줄마다 보여준다 */}
      {actionError && (
        <p role="alert" className="rounded-[10px] bg-err-bg px-3 py-2.5 text-[13px] break-keep whitespace-pre-line text-err [overflow-wrap:anywhere]">
          {actionError}
        </p>
      )}
      {renderList()}
    </section>
  )
}

export default TaskAttachments
