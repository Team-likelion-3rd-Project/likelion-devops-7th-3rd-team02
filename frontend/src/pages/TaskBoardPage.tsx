import { useState } from 'react'
import { useParams } from 'react-router-dom'

import Pagination from '../components/common/Pagination'
import { EmptyState, ErrorMessage, Loading } from '../components/common/PanelState'
import { buttonClass, primaryButtonClass } from '../components/common/styles'
import GithubIssueImportModal from '../components/task/GithubIssueImportModal'
import TaskBoard from '../components/task/TaskBoard'
import TaskCreateModal from '../components/task/TaskCreateModal'
import TaskDetailPanel from '../components/task/TaskDetailPanel'
import TaskEditModal from '../components/task/TaskEditModal'
import TaskFilterBar from '../components/task/TaskFilterBar'
import { useProjectContext } from '../hooks/useProjectContext'
import { useProjectMembers } from '../hooks/useProjectMembers'
import { TASK_PAGE_SIZE, useProjectTasks } from '../hooks/useProjectTasks'

type OpenModal = 'create' | 'edit' | 'import' | null

// 설계서 4.5 작업 보드
function TaskBoardContent({ projectId }: { projectId: number }) {
  const { currentProject } = useProjectContext()
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
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpenModal('import')} className={buttonClass}>
                GitHub 이슈 가져오기
              </button>
              <button
                type="button"
                onClick={() => setOpenModal('create')}
                className={primaryButtonClass}
              >
                작업 추가
              </button>
            </div>
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
          onSelect={setSelectedTaskId}
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
          {currentProject && (
            <p className="mt-1 text-[13px] text-muted">{currentProject.name}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setOpenModal('import')} className={buttonClass}>
            GitHub 이슈 가져오기
          </button>
          <button
            type="button"
            onClick={() => setOpenModal('create')}
            className={primaryButtonClass}
          >
            작업 추가
          </button>
        </div>
      </div>

      <TaskFilterBar filters={filters} members={members} onChange={updateFilters} />

      {/* 검색·필터·페이지 변경 중에는 기존 목록을 유지하고 로딩을 알린다 (설계서 5.1). */}
      <p role="status" className="sr-only">
        {isLoading && tasks ? '업무를 불러오는 중입니다.' : ''}
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5 max-[1200px]:grid-cols-1">
        <div className={isLoading && tasks ? 'opacity-60 transition-opacity' : ''}>
          {renderBoard()}
        </div>

        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onEdit={() => setOpenModal('edit')} />
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

      {openModal === 'import' && (
        <GithubIssueImportModal
          projectId={projectId}
          onImported={reload}
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
