const WIDTH = 300
const HEIGHT = 84
const PAD_X = 4
const PAD_TOP = 8

export interface TrendSeries {
  label: string
  values: number[]
  // tokens.css 색 이름 (stroke-accent, stroke-merged 등)
  strokeClass: string
  fillClass?: string
}

const toPoints = (values: number[], yMax: number) =>
  values.map((value, index) => {
    const x =
      values.length === 1
        ? WIDTH / 2
        : PAD_X + (index * (WIDTH - PAD_X * 2)) / (values.length - 1)
    const y = HEIGHT - 1 - (Math.min(value, yMax) / yMax) * (HEIGHT - 1 - PAD_TOP)
    return [x, y] as const
  })

// 설계서 4.8 추이 차트: 라이브러리 없이 SVG 선 차트로 그린다 (기준선 없음).
function TrendChart({
  title,
  unit,
  series,
  timeLabels,
  yMax: fixedMax,
  summary,
}: {
  title: string
  unit: string
  series: TrendSeries[]
  timeLabels: string[]
  yMax?: number
  summary: string
}) {
  const allValues = series.flatMap((item) => item.values)
  const yMax = fixedMax ?? Math.max(1, ...allValues) * 1.15

  return (
    <div className="px-[18px] py-4">
      <h4 className="mb-2 flex justify-between gap-2 text-[13.5px] font-semibold">
        {title}
        <span className="text-[12.5px] font-normal text-muted">{unit}</span>
      </h4>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
      >
        <line x1="0" x2={WIDTH} y1={HEIGHT - 1} y2={HEIGHT - 1} className="stroke-line2" />
        {series.map((item) => {
          const points = toPoints(item.values, yMax)
          if (points.length === 0) return null
          const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
          const area = `M${line.replaceAll(' ', ' L')} L${points[points.length - 1][0].toFixed(1)},${HEIGHT} L${points[0][0].toFixed(1)},${HEIGHT} Z`

          return (
            <g key={item.label}>
              {item.fillClass && <path d={area} className={item.fillClass} opacity={0.1} />}
              <polyline
                points={line}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={item.strokeClass}
              />
            </g>
          )
        })}
      </svg>

      <div aria-hidden="true" className="mt-1 flex justify-between text-[11.5px] text-muted">
        {timeLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  )
}

export default TrendChart
