import type { ReactNode } from 'react'

const toneClass = {
  warn: 'bg-warn-bg text-warn',
  err: 'bg-err-bg text-err',
} as const

// 시안 .notice: 만료 안내(warn), 요청 오류(err)
function FormNotice({
  tone,
  children,
}: {
  tone: keyof typeof toneClass
  children: ReactNode
}) {
  return (
    <div
      role={tone === 'err' ? 'alert' : 'status'}
      className={`flex flex-wrap items-center gap-x-2.5 rounded-[10px] px-3.5 py-[11px] text-[13px] ${toneClass[tone]}`}
    >
      {children}
    </div>
  )
}

export default FormNotice
