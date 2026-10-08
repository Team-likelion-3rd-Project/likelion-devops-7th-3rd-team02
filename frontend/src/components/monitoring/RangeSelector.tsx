import { focusRing } from '../common/styles'
import { RANGE_LABEL } from '../../utils/monitoring'
import type { MonitoringRange } from '../../types/monitoring'

const RANGES: MonitoringRange[] = ['1h', '6h', '24h']

// 시안 .seg: 1시간 / 6시간 / 24시간 (설계서 3.8)
function RangeSelector({
  value,
  onChange,
}: {
  value: MonitoringRange
  onChange: (range: MonitoringRange) => void
}) {
  return (
    <div role="group" aria-label="기간" className="flex overflow-hidden rounded-lg border border-line">
      {RANGES.map((range) => {
        const isActive = range === value

        return (
          <button
            key={range}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(range)}
            className={`flex h-8 cursor-pointer items-center px-3 ${focusRing} focus-visible:-outline-offset-2 ${
              isActive
                ? 'bg-accent-bg font-semibold text-accent'
                : 'font-medium text-muted hover:bg-hover'
            }`}
          >
            {RANGE_LABEL[range]}
          </button>
        )
      })}
    </div>
  )
}

export default RangeSelector
