import { NavLink, useNavigate } from 'react-router-dom'

import BrandLogo from './BrandLogo'
import { useProjectContext } from '../../hooks/useProjectContext'
import { clearAuthStorage } from '../../utils/authStorage'
import { PROJECT_ROLE_LABEL } from '../../utils/projectRole'

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

      {currentProject && (
        <div className="rounded-[10px] border border-line bg-page px-3 py-2.5">
          <b className="block font-semibold">{currentProject.name}</b>
          {currentProject.role && (
            <span className="text-[12px] text-muted">
              내 역할: {PROJECT_ROLE_LABEL[currentProject.role]}
            </span>
          )}
        </div>
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

      <div className="mt-auto border-t border-line2 px-2 pt-3.5 text-[13px]">
        {currentUser && <b className="block font-semibold">{currentUser.name}</b>}
        <button
          type="button"
          onClick={handleLogout}
          className={`mt-2 inline-block cursor-pointer text-[12px] text-muted underline ${focusRing}`}
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
