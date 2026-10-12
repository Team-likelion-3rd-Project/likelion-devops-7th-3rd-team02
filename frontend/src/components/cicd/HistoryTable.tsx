import type { ReactNode } from 'react'

import Pagination from '../common/Pagination'
import Panel from '../common/Panel'
import { EmptyState, ErrorMessage, Loading } from '../common/PanelState'
import { tdClass, thClass } from '../common/styles'

export interface HistoryColumn<T> {
  header: string
  render: (row: T) => ReactNode
  className?: string
}

// 파이프라인·배포 이력 공통 표 (설계서 4.7: page, size로 조회, 작성자 열 없음)
function HistoryTable<T extends { id: number }>({
  title,
  columns,
  rows,
  isLoading,
  error,
  onRetry,
  emptyMessage,
  loadingMessage,
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
}: {
  title: string
  columns: HistoryColumn<T>[]
  rows: T[] | undefined
  isLoading: boolean
  error: string
  onRetry: () => void
  emptyMessage: string
  loadingMessage: string
  page: number
  pageSize: number
  totalCount?: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const hasNextPage =
    totalCount !== undefined
      ? (page + 1) * pageSize < totalCount
      : (rows?.length ?? 0) === pageSize

  const renderBody = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && !rows) return <Loading message={loadingMessage} />
    if (!rows || rows.length === 0) return <EmptyState message={emptyMessage} />

    return (
      <>
        <div className={`overflow-x-auto ${isLoading ? 'opacity-60' : ''}`}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.header} scope="col" className={thClass}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-hover [&:last-child>td]:border-b-0">
                  {columns.map((column) => (
                    <td key={column.header} className={`${tdClass} ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          pageSize={pageSize}
          itemCount={rows.length}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          onChange={onPageChange}
          className="border-t border-line2 px-[18px] py-3"
        />
      </>
    )
  }

  return (
    <Panel title={title} className={className}>
      {renderBody()}
    </Panel>
  )
}

export default HistoryTable
