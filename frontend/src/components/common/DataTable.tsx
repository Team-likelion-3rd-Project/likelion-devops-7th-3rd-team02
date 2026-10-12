import type { ReactNode } from 'react'

import { tdClass, thClass } from './styles'

export interface DataColumn<T> {
  header: string
  render: (row: T) => ReactNode
  className?: string | ((row: T) => string)
}

// 시안 table 스타일의 단순 표 (페이지 이동 없음)
function DataTable<T>({
  columns,
  rows,
  getRowKey,
  className = '',
}: {
  columns: DataColumn<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  className?: string
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
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
            <tr key={getRowKey(row)} className="hover:bg-hover [&:last-child>td]:border-b-0">
              {columns.map((column) => {
                const extra =
                  typeof column.className === 'function' ? column.className(row) : column.className

                return (
                  <td key={column.header} className={`${tdClass} ${extra ?? ''}`}>
                    {column.render(row)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
