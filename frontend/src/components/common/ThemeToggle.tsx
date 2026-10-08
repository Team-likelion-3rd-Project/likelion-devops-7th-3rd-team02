import { Moon, Sun } from 'lucide-react'

import { useTheme } from '../../hooks/useTheme'
import type { Theme } from '../../utils/theme'

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: '화이트 모드', Icon: Sun },
  { value: 'dark', label: '다크 모드', Icon: Moon },
]

// 화이트/다크 두 칸 스위치. 선택된 칸에 패널색 thumb가 놓인다. (높이 34px, radius 8px)
function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="화면 테마"
      className={`relative inline-flex h-[34px] flex-none items-center rounded-lg border border-line bg-page p-[3px] ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-[3px] left-[3px] h-[26px] w-[30px] rounded-[5px] border border-line2 bg-panel shadow-panel transition-transform duration-200 ease-out motion-reduce:transition-none ${
          theme === 'dark' ? 'translate-x-[30px]' : 'translate-x-0'
        }`}
      />

      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value

        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
            className={`relative z-10 flex h-[26px] w-[30px] cursor-pointer items-center justify-center rounded-[5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
              isActive ? 'text-ink' : 'text-muted hover:text-ink'
            }`}
          >
            <Icon size={15} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}

export default ThemeToggle
