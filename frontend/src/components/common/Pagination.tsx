import { focusRing } from './styles'

const pageButtonClass = `flex h-[30px] min-w-[30px] cursor-pointer items-center justify-center rounded-lg border border-transparent px-2 hover:bg-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent ${focusRing}`

// 시안 .pager: 왼쪽 범위 표시, 오른쪽 이전 / 현재 페이지 / 다음
// 전체 건수는 응답에 있을 때만 표시한다.
function Pagination({
  page,
  pageSize,
  itemCount,
  totalCount,
  hasNextPage,
  onChange,
  className = '',
}: {
  page: number
  pageSize: number
  itemCount: number
  totalCount?: number
  hasNextPage: boolean
  onChange: (page: number) => void
  className?: string
}) {
  const start = page * pageSize + 1
  const end = page * pageSize + itemCount

  if (page === 0 && !hasNextPage) {
    return null
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 text-[13px] text-muted ${className}`}
    >
      <span>
        {totalCount !== undefined && itemCount > 0
          ? `${totalCount}개 중 ${start}-${end}`
          : ''}
      </span>

      <nav aria-label="페이지 이동" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className={pageButtonClass}
        >
          이전
        </button>
        <span
          aria-current="page"
          className="flex h-[30px] min-w-[30px] items-center justify-center rounded-lg border border-line bg-page font-semibold text-ink"
        >
          {page + 1}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={!hasNextPage}
          className={pageButtonClass}
        >
          다음
        </button>
      </nav>
    </div>
  )
}

export default Pagination
