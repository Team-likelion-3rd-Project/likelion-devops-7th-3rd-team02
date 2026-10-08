import type { ReactNode } from 'react'

import { buttonClass } from './styles'

// 패널 안의 로딩·오류·빈 상태 (설계서 5장)
function StateBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-[18px] py-8 text-center text-[13px] text-muted">
      {children}
    </div>
  )
}

export function Loading({ message }: { message: string }) {
  return (
    <StateBox>
      <p role="status">{message}</p>
    </StateBox>
  )
}

export function ErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <StateBox>
      <p role="alert" className="text-err">
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonClass}>
          다시 시도
        </button>
      )}
    </StateBox>
  )
}

export function EmptyState({
  message,
  action,
}: {
  message: string
  action?: ReactNode
}) {
  return (
    <StateBox>
      <p>{message}</p>
      {action}
    </StateBox>
  )
}
