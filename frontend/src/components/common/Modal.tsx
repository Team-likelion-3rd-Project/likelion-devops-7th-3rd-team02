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
  maxWidth = 'max-w-[520px]',
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  maxWidth?: string
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
        className={`flex max-h-full w-full ${maxWidth} flex-col gap-4 overflow-y-auto rounded-[14px] border border-line bg-panel p-6 text-ink`}
      >
        {/* 시안 ProjectModal: 폭 520px, radius 14px, 여백 24px, 제목 20px */}
        <div>
          <h2 id="modal-title" className="text-[20px] font-bold tracking-[-0.02em]">
            {title}
          </h2>
          {description && <p className="text-muted">{description}</p>}
        </div>

        {children}

        <div className="flex justify-end gap-2">{footer}</div>
      </div>
    </div>,
    document.body,
  )
}

export default Modal
