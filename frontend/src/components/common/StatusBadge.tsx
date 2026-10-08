import type { ReactNode } from 'react'

// 의미별 색 (CLAUDE.md): 진행 중=info, 병합=merged, 경고=warn, 오류=err, 정상/완료=ok, 대기=muted
export type BadgeTone = 'ok' | 'warn' | 'err' | 'info' | 'merged' | 'muted'

const toneClass: Record<BadgeTone, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  err: 'bg-err-bg text-err',
  info: 'bg-info-bg text-info',
  merged: 'bg-merged-bg text-merged',
  muted: 'border border-line2 bg-hover text-muted',
}

// 시안 .bd: 높이 22px, 앞에 상태 점. plain은 점 없이 (역할 표시 등)
function StatusBadge({
  tone,
  plain = false,
  children,
}: {
  tone: BadgeTone
  plain?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex h-[22px] flex-none items-center gap-1.5 rounded-full px-[9px] text-[12px] font-semibold whitespace-nowrap ${toneClass[tone]}`}
    >
      {!plain && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  )
}

export default StatusBadge
