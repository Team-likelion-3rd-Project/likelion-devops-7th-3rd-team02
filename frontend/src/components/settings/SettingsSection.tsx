import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

import { focusRing } from '../common/styles'

// 설정 화면의 연결 한 줄: 무엇이 보이게 되는지 + 연결 상태. 누르면 펼쳐서 연결한다.
function SettingsSection({
  id,
  title,
  description,
  status,
  isOpen,
  onToggle,
  children,
}: {
  id: string
  title: string
  description: string
  status: ReactNode
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const bodyId = `${id}-body`

  return (
    <li id={id} className="scroll-mt-6 border-b border-line2 last:border-b-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={onToggle}
        className={`flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-4 text-left hover:bg-hover ${focusRing} focus-visible:-outline-offset-2`}
      >
        <span className="min-w-0 flex-1 basis-[280px]">
          <span className="block text-[15px] font-semibold">{title}</span>
          <span className="mt-0.5 block text-[13px] text-muted break-keep">{description}</span>
        </span>
        {/* 좁은 화면에서는 상태가 설명 아래 줄로 내려간다. */}
        <span className="ml-auto flex min-w-0 items-center gap-2">
          {status}
          <ChevronDown
            aria-hidden="true"
            size={18}
            className={`flex-none text-muted transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {/* 접어도 내용은 유지한다 (발급한 토큰을 접었다 펴도 잃지 않게). */}
      <div id={bodyId} hidden={!isOpen} className="flex flex-col gap-4 px-[18px] pt-1 pb-5">
        {children}
      </div>
    </li>
  )
}

export default SettingsSection
