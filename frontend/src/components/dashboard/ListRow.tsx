import type { ReactNode } from 'react'

// 시안 .li: 제목(500, 말줄임) + 보조 정보(12.5px muted) + 오른쪽 배지
function ListRow({
  title,
  meta,
  children,
}: {
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line2 px-[18px] py-[13px] last:border-b-0 hover:bg-hover">
      <div className="min-w-0 flex-1">
        <b className="block truncate font-medium">{title}</b>
        {meta && <span className="text-[12.5px] text-muted">{meta}</span>}
      </div>
      {children}
    </li>
  )
}

export default ListRow
