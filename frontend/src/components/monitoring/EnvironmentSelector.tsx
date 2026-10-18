import { fieldClass } from '../common/styles'
import type { CloudEnvironment } from '../../types/cloud'

// 모니터링에서 볼 클라우드 환경 (CL1). 처음에는 기본 환경을 보여준다.
// 환경이 하나뿐이면 고를 것이 없으니 이름만 보여준다.
function EnvironmentSelector({
  environments,
  value,
  onChange,
}: {
  environments: CloudEnvironment[]
  value: string | null
  onChange: (env: string) => void
}) {
  if (environments.length === 0) return null

  const current =
    environments.find((environment) => environment.name === value) ??
    environments.find((environment) => environment.isDefault) ??
    environments[0]

  if (environments.length === 1) {
    return (
      <p className="flex h-8 items-center gap-1.5 text-[13px]">
        <span className="text-muted">환경</span>
        <b title={current.label} className="max-w-[220px] truncate font-semibold">
          {current.label}
        </b>
      </p>
    )
  }

  return (
    <label className="flex items-center gap-2 text-[13px]">
      <span className="text-muted">환경</span>
      <select
        value={current.name}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass} h-8 max-w-[240px] cursor-pointer`}
      >
        {environments.map((environment) => {
          const notes = [
            environment.label !== environment.name ? environment.name : null,
            environment.isDefault ? '기본' : null,
          ].filter(Boolean)

          return (
            <option key={environment.id} value={environment.name}>
              {notes.length > 0 ? `${environment.label} (${notes.join(', ')})` : environment.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export default EnvironmentSelector
