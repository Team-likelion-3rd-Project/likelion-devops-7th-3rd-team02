import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import logoMark from '../../assets/logo-mark.svg'
import ProfileModal from './ProfileModal'
import ProjectSwitcher from './ProjectSwitcher'
import MemberModal from '../project/MemberModal'
import ThemeToggle from './ThemeToggle'
import { useProjectContext } from '../../hooks/useProjectContext'
import { useProjectMembers } from '../../hooks/useProjectMembers'
import { clearAuthStorage } from '../../utils/authStorage'
import { isProjectOwner, projectRoleLabel } from '../../utils/projectRole'

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

// 설계서 4.1 공통 Layout: 로고(대시보드)와 프로젝트 전환, 팀원 박스, 이동 메뉴, 사용자와 로그아웃
function Sidebar() {
  const navigate = useNavigate()
  const { currentProject, currentUser } = useProjectContext()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMemberOpen, setIsMemberOpen] = useState(false)
  const members = useProjectMembers(currentProject?.id ?? null)

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
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {/* 로고는 대시보드로 가는 지름길이다. 대시보드 메뉴도 그대로 둔다. */}
          <Link
            to="/projects"
            aria-label="대시보드"
            title="대시보드"
            className={`flex-none rounded-lg ${focusRing}`}
          >
            <img src={logoMark} alt="" className="h-[34px] w-[34px]" />
          </Link>
          <ProjectSwitcher />
        </div>

        {/* 팀원 박스: 내 역할과 팀원 수, 누르면 팀원 목록 (설계서 10.4) */}
        {currentProject && (
          <button
            type="button"
            onClick={() => setIsMemberOpen(true)}
            aria-label={`${currentProject.name} 팀원 보기`}
            className={`flex cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-line2 px-3 py-2 text-[12.5px] text-muted hover:bg-hover ${focusRing}`}
          >
            <span className="truncate">
              내 역할: {projectRoleLabel(currentProject, currentUser?.userId)}
            </span>
            <span className="flex flex-none items-center">
              {members.members.length > 0 ? `팀원 ${members.members.length}명` : '팀원 보기'}
              <ChevronRight aria-hidden="true" size={14} />
            </span>
          </button>
        )}
      </div>

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
          onClose={() => {
            setIsMemberOpen(false)
            // 모달에서 팀원을 추가했을 수 있으니 팀원 수를 다시 불러온다.
            members.reload()
          }}
        />
      )}

      {isProfileOpen && currentUser && (
        <ProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} />
      )}
    </aside>
  )
}

export default Sidebar
