import type { RefObject } from 'react'
import { Menu, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

import { focusRing } from './styles'
import { useIncidentContext } from '../../hooks/useIncidentContext'
import { useProjectContext } from '../../hooks/useProjectContext'

// 900px보다 좁은 화면의 위쪽 막대: 메뉴 열기, 현재 프로젝트, 전체 장애 배지 (설계서 4.1)
// 넓은 화면에서는 사이드바가 늘 보이므로 숨긴다.
function MobileTopBar({
  isMenuOpen,
  onOpenMenu,
  menuButtonRef,
}: {
  isMenuOpen: boolean
  onOpenMenu: () => void
  menuButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const { currentProject } = useProjectContext()
  const { data: myIncidents } = useIncidentContext()
  const openCount = myIncidents?.openCount ?? 0

  return (
    <header className="sticky top-0 z-20 hidden h-[52px] items-center gap-2 border-b border-line bg-chrome px-3 max-[900px]:flex">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenMenu}
        aria-label="메뉴 열기"
        aria-expanded={isMenuOpen}
        aria-controls="app-sidebar"
        className={`flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-lg text-ink hover:bg-hover ${focusRing}`}
      >
        <Menu aria-hidden="true" size={20} />
      </button>

      <span title={currentProject?.name} className="min-w-0 flex-1 truncate font-semibold">
        {currentProject?.name ?? 'DevFlow'}
      </span>

      <Link
        to="/incidents"
        aria-label={openCount > 0 ? `전체 장애, 확인 필요 ${openCount}건` : '전체 장애'}
        className={`relative flex h-9 w-9 flex-none items-center justify-center rounded-lg text-muted hover:bg-hover ${focusRing}`}
      >
        <TriangleAlert aria-hidden="true" size={19} />
        {openCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-err px-1 text-[11px] font-bold text-white"
          >
            {openCount > 99 ? '99+' : openCount}
          </span>
        )}
      </Link>
    </header>
  )
}

export default MobileTopBar
