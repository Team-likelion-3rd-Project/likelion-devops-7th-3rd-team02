import type { ReactNode } from 'react'

import { focusRing } from './styles'

// 모달 입력칸 공통 스타일 (시안 input: 36px, textarea는 높이 자동)
export const formControlClass = `w-full min-w-0 rounded-lg border border-line bg-page px-3 text-ink placeholder:text-muted ${focusRing}`

function FormField({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null

  return (
    <p role="alert" className="rounded-[10px] bg-err-bg px-3.5 py-[11px] text-[13px] text-err">
      {message}
    </p>
  )
}

export default FormField
