import type { ReactNode } from 'react'

// 시안 .kv: 왼쪽 라벨 110px(muted), 오른쪽 값
function KeyValueList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted">{item.label}</dt>
          <dd className="min-w-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default KeyValueList
