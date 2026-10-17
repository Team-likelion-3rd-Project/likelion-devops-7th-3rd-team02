import { useEffect, useEffectEvent, useState } from 'react'
import { useParams } from 'react-router-dom'

import Pagination from '../components/common/Pagination'
import { EmptyState, ErrorMessage, Loading } from '../components/common/PanelState'
import { buttonClass, primaryButtonClass } from '../components/common/styles'
import TaskBoard from '../components/task/TaskBoard'
import TaskCreateModal from '../components/task/TaskCreateModal'
import TaskDetailPanel from '../components/task/TaskDetailPanel'
import TaskEditModal from '../components/task/TaskEditModal'
import TaskFilterBar from '../components/task/TaskFilterBar'
import { useProjectContext } from '../hooks/useProjectContext'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { TASK_PAGE_SIZE, useProjectTasks } from '../hooks/useProjectTasks'

type OpenModal = 'create' | 'edit' | null

// 설계서 4.5 작업 보드
function TaskBoardContent({ projectId }: { projectId: number }) {
  const { currentProject, currentUser } = useProjectContext()
  const { members } = useProjectMembers(projectId)
  const {
    tasks,
    totalCount,
    statusCounts,
    isLoading,
    error,
    reload,
    filters,
    updateFilters,
    resetFilters,
    isFiltered,
    page,
    setPage,
    hasNextPage,
  } = useProjectTasks(projectId)

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [openModal, setOpenModal] = useState<OpenModal>(null)

  const selectedTask = tasks?.find((task) => task.id === selectedTaskId) ?? null

  // 같은 카드를 다시 누르면 닫는다.
  const toggleTask = (taskId: number) =>
    setSelectedTaskId((prev) => (prev === taskId ? null : taskId))

  // 상세를 닫으면 포커스를 보던 카드로 돌려준다.
  const closeDetail = () => {
    const taskId = selectedTaskId
    setSelectedTaskId(null)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-task-id="${taskId}"]`)?.focus(),
    )
  }

  // Esc로 상세를 닫는다. 어떤 모달이든(사이드바의 팀원·프로필 모달 포함) 열려 있거나
  // 다른 곳(사이드바 드롭다운 등)이 먼저 처리했으면 넘긴다.
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (document.querySelector('[role="dialog"]')) return
    closeDetail()
  })

  const isDetailOpen = selectedTask !== null

  useEffect(() => {
    if (!isDetailOpen) return
    const listener = (event: KeyboardEvent) => handleEscape(event)
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  }, [isDetailOpen])

  const renderBoard = () => {
    if (error) return <ErrorMessage message={error} onRetry={reload} />
    if (isLoading && !tasks) return <Loading message="업무를 불러오는 중입니다." />

    if (!tasks || tasks.length === 0) {
      return isFiltered ? (
        <EmptyState
          message="조건에 맞는 업무가 없어요."
          action={
            <button type="button" onClick={resetFilters} className={buttonClass}>
              필터 초기화
            </button>
          }
        />
      ) : (
        <EmptyState
          message="등록된 업무가 없어요."
          action={
            <button
              type="button"
              onClick={() => setOpenModal('create')}
              className={primaryButtonClass}
            >
              작업 추가
            </button>
          }
        />
      )
    }

    return (
      <>
        <TaskBoard
          tasks={tasks}
          statusCounts={statusCounts}
          selectedTaskId={selectedTaskId}
          currentUserId={currentUser?.userId}
          onSelect={toggleTask}
        />
        <Pagination
          page={page}
          pageSize={TASK_PAGE_SIZE}
          itemCount={tasks.length}
          totalCount={totalCount}
          hasNextPage={hasNextPage}
          onChange={setPage}
          className="pt-3.5"
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em]">작업 보드</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
            {currentProject && <span>{currentProject.name}</span>}
            {/* 카드 왼쪽 막대의 뜻 */}
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3.5 w-[3px] rounded-full bg-accent" />
              내 작업
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpenModal('create')}
          className={primaryButtonClass}
        >
          작업 추가
        </button>
      </div>

      <TaskFilterBar filters={filters} members={members} onChange={updateFilters} />

      {/* 검색·필터·페이지 변경 중에는 기존 목록을 유지하고 로딩을 알린다 (설계서 5.1). */}
      <p role="status" className="sr-only">
        {isLoading && tasks ? '업무를 불러오는 중입니다.' : ''}
      </p>

      {/* 업무를 고르지 않으면 보드가 전체 폭을 쓰고, 고르면 오른쪽에 상세가 열린다 (설계서 4.5). */}
      <div
        className={`grid items-start gap-5 max-[1200px]:grid-cols-1 ${
          isDetailOpen ? 'grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
        }`}
      >
        <div className={isLoading && tasks ? 'opacity-60 transition-opacity' : ''}>
          {renderBoard()}
        </div>

        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            onEdit={() => setOpenModal('edit')}
            onClose={closeDetail}
          />
        )}
      </div>

      {openModal === 'create' && (
        <TaskCreateModal
          projectId={projectId}
          members={members}
          onCreated={reload}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === 'edit' && selectedTask && (
        <TaskEditModal
          projectId={projectId}
          task={selectedTask}
          members={members}
          onSaved={reload}
          onClose={() => setOpenModal(null)}
        />
      )}
    </>
  )
}

// 프로젝트가 바뀌면 필터·선택 상태를 새로 시작한다.
function TaskBoardPage() {
  const params = useParams()
  const projectId = params.projectId ? Number(params.projectId) : null

  if (projectId === null || Number.isNaN(projectId)) {
    return null
  }

  return <TaskBoardContent key={projectId} projectId={projectId} />
}

export default TaskBoardPage
