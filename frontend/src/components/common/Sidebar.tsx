import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

import BrandLogo from './BrandLogo'
import ProfileModal from './ProfileModal'
import MemberModal from '../project/MemberModal'
import ThemeToggle from './ThemeToggle'
import { useProjectContext } from '../../hooks/useProjectContext'
import { clearAuthStorage } from '../../utils/authStorage'
import { isProjectOwner, PROJECT_ROLE_LABEL } from '../../utils/projectRole'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-lg px-3 py-[9px]',
    focusRing,
    isActive
      ? 'bg-accent-bg font-semibold text-accent'
      : 'font-medium text-muted hover:bg-hover',
  ].join(' ')

// 설계서 4.1 공통 Layout: 로고, 현재 프로젝트와 내 역할, 이동 메뉴, 사용자와 로그아웃
function Sidebar() {
  const navigate = useNavigate()
  const { currentProject, currentUser } = useProjectContext()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMemberOpen, setIsMemberOpen] = useState(false)

  const isOwner = isProjectOwner(currentProject, currentUser?.userId)

  const projectId = currentProject?.id
  const projectMenus = [
    { label: '작업 보드', path: 'tasks' },
    { label: 'CI/CD', path: 'cicd' },
    { label: '모니터링', path: 'monitoring' },
  ]

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-[228px] flex-none flex-col gap-5 border-r border-line bg-chrome px-3.5 py-5 max-[900px]:hidden">
      <BrandLogo className="px-2" />

      {/* 프로젝트 박스를 누르면 팀원 목록 (설계서 10.4 결정) */}
      {currentProject && (
        <button
          type="button"
          onClick={() => setIsMemberOpen(true)}
          aria-label={`${currentProject.name} 팀원 보기`}
          className={`cursor-pointer rounded-[10px] border border-line bg-page px-3 py-2.5 text-left hover:border-accent ${focusRing}`}
        >
          <b className="block truncate font-semibold">{currentProject.name}</b>
          {currentProject.role && (
            <span className="text-[12px] text-muted">
              내 역할: {PROJECT_ROLE_LABEL[currentProject.role]}
            </span>
          )}
        </button>
      )}

      <nav className="flex flex-col gap-0.5">
        <NavLink to="/projects" end className={navItemClass}>
          대시보드
        </NavLink>

        {projectMenus.map((menu) =>
          projectId ? (
            <NavLink
              key={menu.path}
              to={`/projects/${projectId}/${menu.path}`}
              className={navItemClass}
            >
              {menu.label}
            </NavLink>
          ) : (
            <span
              key={menu.path}
              aria-disabled="true"
              className="cursor-not-allowed rounded-lg px-3 py-[9px] font-medium text-muted opacity-45"
            >
              {menu.label}
            </span>
          ),
        )}
      </nav>

      <div className="mt-auto flex items-end justify-between gap-2 border-t border-line2 px-2 pt-3.5 text-[13px]">
        <div className="min-w-0">
          {/* 사용자 이름을 누르면 프로필 모달 (설계서 4.1, 10.3) */}
          {currentUser && (
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className={`block max-w-full cursor-pointer truncate text-left font-semibold hover:underline ${focusRing}`}
            >
              {currentUser.name}
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={`mt-2 inline-block cursor-pointer text-[12px] text-muted underline ${focusRing}`}
          >
            로그아웃
          </button>
        </div>

        <ThemeToggle />
      </div>
      {isMemberOpen && currentProject && (
        <MemberModal
          project={currentProject}
          isOwner={isOwner}
          onClose={() => setIsMemberOpen(false)}
        />
      )}

      {isProfileOpen && currentUser && (
        <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} />
      )}
    </aside>
  )
}

export default Sidebar
