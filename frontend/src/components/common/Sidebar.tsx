import { useState } from 'react'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import logoMark from '../../assets/logo-mark.svg'
import ProfileModal from './ProfileModal'
import ProjectSwitcher from './ProjectSwitcher'
import MemberModal from '../project/MemberModal'
import ThemeToggle from './ThemeToggle'
import { useIncidentContext } from '../../hooks/useIncidentContext'
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

// 위쪽 구분선은 메뉴 바깥 여백에 그린다 (활성 배경과 겹치지 않게).
const dividedClass =
  'relative mt-[13px] before:absolute before:-top-[7px] before:right-0 before:left-0 before:h-px before:bg-line2'

// 설계서 4.1 공통 Layout: 로고(대시보드)와 프로젝트 전환, 팀원 박스, 이동 메뉴, 사용자와 로그아웃
function Sidebar() {
  const navigate = useNavigate()
  const { currentProject, currentUser } = useProjectContext()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMemberOpen, setIsMemberOpen] = useState(false)
  const members = useProjectMembers(currentProject?.id ?? null)
  const { data: myIncidents } = useIncidentContext()
  const openCount = myIncidents?.openCount ?? 0

  const isOwner = isProjectOwner(currentProject, currentUser?.userId)

  const projectId = currentProject?.id
  const projectMenus = [
    { label: '작업 보드', path: 'tasks' },
    { label: 'CI/CD', path: 'cicd' },
    { label: '모니터링', path: 'monitoring' },
    // 가끔 들어오는 연결 설정이라 매일 보는 메뉴와 줄로 나눈다.
    { label: '설정', path: 'settings', divided: true },
  ]

  const handleLogout = () => {
    clearAuthStorage()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-[228px] flex-none flex-col gap-5 border-r border-line bg-chrome px-3.5 py-5 max-[900px]:hidden">
      <div className="flex flex-col gap-2">
        {/* 맨 윗줄은 모든 프로젝트에 걸친 영역: 로고(대시보드), 전체 장애 (설계서 4.1) */}
        <div className="flex items-center justify-between gap-2">
          {/* 로고는 대시보드로 가는 지름길이다. 대시보드 메뉴도 그대로 둔다. */}
          <Link
            to="/projects"
            aria-label="대시보드"
            title="대시보드"
            className={`flex-none rounded-lg ${focusRing}`}
          >
            <img src={logoMark} alt="" className="h-[34px] w-[34px]" />
          </Link>

          {/* 확인이 필요한 장애가 있을 때만 숫자 배지를 보여준다. */}
          <NavLink
            to="/incidents"
            aria-label={openCount > 0 ? `전체 장애, 확인 필요 ${openCount}건` : '전체 장애'}
            title="전체 장애"
            className={({ isActive }) =>
              `relative flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg ${focusRing} ${
                isActive ? 'bg-accent-bg text-accent' : openCount > 0 ? 'text-err hover:bg-hover' : 'text-muted hover:bg-hover'
              }`
            }
          >
            <TriangleAlert aria-hidden="true" size={19} />
            {openCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-err px-1 text-[11px] font-bold text-white"
              >
                {openCount > 99 ? '99+' : openCount}
              </span>
            )}
          </NavLink>
        </div>

        {/* 여기부터 선택한 프로젝트 영역 */}
        <ProjectSwitcher />

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
              className={(state) => `${navItemClass(state)} ${menu.divided ? dividedClass : ''}`}
            >
              {menu.label}
            </NavLink>
          ) : (
            <span
              key={menu.path}
              aria-disabled="true"
              className={`cursor-not-allowed rounded-lg px-3 py-[9px] font-medium text-muted opacity-45 ${menu.divided ? dividedClass : ''}`}
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
