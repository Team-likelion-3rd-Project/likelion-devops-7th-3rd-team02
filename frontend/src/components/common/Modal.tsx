import { useEffect, useEffectEvent } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// 공통 모달: 바깥 클릭·Esc로 닫기 (2차 동작 유지). 시안 보드가 없는 모달은 설계서 9장 구성을 따른다.
function Modal({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}) {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-[460px] flex-col overflow-y-auto rounded-xl border border-line bg-panel text-ink"
      >
        <div className="px-6 pt-6 pb-4">
          <h2 id="modal-title" className="text-[18px] font-bold tracking-[-0.02em]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-muted">{description}</p>
          )}
        </div>

        <div className="flex flex-col gap-4 px-6">{children}</div>

        <div className="flex justify-end gap-2 px-6 pt-5 pb-6">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
