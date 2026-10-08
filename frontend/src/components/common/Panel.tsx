import type { ReactNode } from 'react'

// 시안 .panel / .ph: radius 12px, 패널 제목 15px/600, 내부 구분선 line2
function Panel({
  title,
  action,
  className = '',
  children,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-panel shadow-panel ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line2 px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export default Panel
