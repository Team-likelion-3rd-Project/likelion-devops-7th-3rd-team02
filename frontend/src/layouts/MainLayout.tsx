import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import MobileTopBar from '../components/common/MobileTopBar'
import ProjectGate from '../components/common/ProjectGate'
import Sidebar from '../components/common/Sidebar'
import IncidentProvider from '../context/IncidentProvider'
import ProjectProvider from '../context/ProjectProvider'

// 이 폭보다 넓으면 사이드바가 늘 보이고, 좁으면 메뉴 버튼으로 연다 (설계서 4.1)
const WIDE_QUERY = '(min-width: 901px)'

function MainLayout() {
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // 다른 화면으로 이동하면(메뉴를 고르면) 닫는다.
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    setIsMenuOpen(false)
  }

  // 닫기 버튼, 바깥, Esc로 닫으면 포커스를 메뉴 버튼으로 돌려준다.
  const closeMenu = () => {
    setIsMenuOpen(false)
    requestAnimationFrame(() => menuButtonRef.current?.focus())
  }

  // 사이드바 안의 모달·드롭다운이 Esc를 먼저 처리했으면 넘긴다.
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (document.querySelector('[role="dialog"]:not(#app-sidebar)')) return
    closeMenu()
  })

  useEffect(() => {
    if (!isMenuOpen) return
    const listener = (event: KeyboardEvent) => handleEscape(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [isMenuOpen])

  // 창을 넓히면 서랍 상태를 닫는다 (넓은 화면에서는 사이드바가 늘 보인다).
  useEffect(() => {
    if (!isMenuOpen) return
    const media = window.matchMedia(WIDE_QUERY)
    const listener = () => {
      if (media.matches) setIsMenuOpen(false)
    }
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [isMenuOpen])

  return (
    <ProjectProvider>
      <IncidentProvider>
        <div className="flex min-h-screen bg-page text-ink">
          <Sidebar isOpen={isMenuOpen} onClose={closeMenu} />

          {isMenuOpen && (
            <div
              aria-hidden="true"
              onClick={closeMenu}
              className="fixed inset-0 z-30 bg-black/45 min-[901px]:hidden"
            />
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            <MobileTopBar
              isMenuOpen={isMenuOpen}
              onOpenMenu={() => setIsMenuOpen(true)}
              menuButtonRef={menuButtonRef}
            />

            <main className="min-w-0 flex-1 px-9 pt-7 pb-12 max-[900px]:px-4 max-[900px]:py-5">
              <ProjectGate>
                <Outlet />
              </ProjectGate>
            </main>
          </div>
        </div>
      </IncidentProvider>
    </ProjectProvider>
  )
}

export default MainLayout
