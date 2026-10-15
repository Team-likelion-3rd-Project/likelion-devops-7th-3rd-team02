import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useMatch, useNavigate } from 'react-router-dom'

import ProjectCreateModal from '../project/ProjectCreateModal'
import { focusRing } from './styles'
import { useProjectContext } from '../../hooks/useProjectContext'
import { projectRoleLabel } from '../../utils/projectRole'

const itemClass = `flex w-full cursor-pointer items-start gap-2 rounded-[7px] px-2.5 py-2 text-left hover:bg-hover ${focusRing}`

// 설계서 4.1: 사이드바 상단의 프로젝트 전환. 프로젝트를 고르는 곳은 여기 한 곳이다.
// 프로젝트 화면에서 바꾸면 보던 메뉴를 유지한다 (작업 보드 → 고른 프로젝트의 작업 보드).
function ProjectSwitcher() {
  const navigate = useNavigate()
  const sectionMatch = useMatch('/projects/:projectId/:section')
  const { projectList, currentProject, currentUser, selectProject, isLoading } =
    useProjectContext()

  const [isOpen, setIsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const items = () =>
    Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-switcher-item]') ?? [])

  // 바깥을 누르면 닫는다.
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  // 열면 현재 프로젝트에 포커스를 둔다.
  const open = () => {
    setIsOpen(true)
    requestAnimationFrame(() => {
      const index = projectList.findIndex((project) => project.id === currentProject?.id)
      items()[Math.max(0, index)]?.focus()
    })
  }

  const close = () => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleSelect = (projectId: number) => {
    close()
    if (projectId === currentProject?.id) return

    if (sectionMatch) {
      navigate(`/projects/${projectId}/${sectionMatch.params.section}`)
    } else {
      selectProject(projectId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return

    event.preventDefault()
    const list = items()
    const index = list.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    list[(index + step + list.length) % list.length]?.focus()
  }

  const triggerLabel = currentProject?.name ?? (isLoading ? '불러오는 중' : '프로젝트 없음')

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="project-switcher-list"
        aria-label={`현재 프로젝트 ${triggerLabel}, 프로젝트 바꾸기`}
        title={currentProject?.name}
        onClick={() => (isOpen ? close() : open())}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 rounded-[9px] border border-line bg-page px-2.5 text-left font-semibold hover:border-accent ${focusRing}`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={`flex-none text-muted transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          id="project-switcher-list"
          className="absolute top-[calc(100%+6px)] left-[-42px] z-20 w-[200px] rounded-[10px] border border-line bg-panel p-1.5 shadow-[0_8px_24px_rgba(22,27,38,0.16)]"
        >
          {projectList.length > 0 ? (
            <ul aria-label="프로젝트" className="max-h-[280px] overflow-y-auto">
              {projectList.map((project) => {
                const isCurrent = project.id === currentProject?.id

                return (
                  <li key={project.id}>
                    <button
                      type="button"
                      data-switcher-item
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => handleSelect(project.id)}
                      className={`${itemClass} ${isCurrent ? 'font-semibold' : ''}`}
                    >
                      <Check
                        aria-hidden="true"
                        size={15}
                        className={`mt-[3px] flex-none text-accent ${isCurrent ? '' : 'invisible'}`}
                      />
                      <span className="min-w-0 flex-1 break-words">{project.name}</span>
                      <span className="flex-none pt-px text-[12px] font-normal text-muted">
                        {projectRoleLabel(project, currentUser?.userId)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="px-2.5 py-2 text-[13px] text-muted">참여 중인 프로젝트가 없어요.</p>
          )}

          <div className="mt-1 border-t border-line2 pt-1">
            <button
              type="button"
              data-switcher-item
              onClick={() => {
                setIsOpen(false)
                setIsCreateOpen(true)
              }}
              className={`${itemClass} font-medium text-accent`}
            >
              <Plus aria-hidden="true" size={15} className="mt-[3px] flex-none" />
              새 프로젝트
            </button>
          </div>
        </div>
      )}

      {isCreateOpen && <ProjectCreateModal onClose={() => setIsCreateOpen(false)} />}
    </div>
  )
}

export default ProjectSwitcher
