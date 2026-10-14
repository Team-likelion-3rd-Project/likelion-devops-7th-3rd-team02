import { useState } from 'react'

import { getTasks } from '../api/taskApi'
import { useAsyncData } from './useAsyncData'
import { useDebouncedValue } from './useDebouncedValue'
import { toTaskPage } from '../utils/task'
import type { TaskListParams, TaskStatus } from '../types/task'

// 설계서 4.5: 한 페이지 12건, 기본 정렬 최근 수정순 (마감일 정렬 없음)
export const TASK_PAGE_SIZE = 12

// sort 허용 값 (Backend 확정): updatedAt,desc(기본) / createdAt,desc / title,asc
export const TASK_SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: '최근 수정순' },
  { value: 'createdAt,desc', label: '최근 생성순' },
  { value: 'title,asc', label: '제목순' },
] as const

export interface TaskFilters {
  keyword: string
  status: TaskStatus | null
  assigneeId: number | null
  sort: string
}

const INITIAL_FILTERS: TaskFilters = {
  keyword: '',
  status: null,
  assigneeId: null,
  sort: TASK_SORT_OPTIONS[0].value,
}

// 검색·필터·정렬·페이지는 서버에 쿼리로 보내고 화면에서 다시 거르지 않는다 (설계서 3.4).
export function useProjectTasks(projectId: number | null) {
  const [filters, setFilters] = useState<TaskFilters>(INITIAL_FILTERS)
  const [page, setPage] = useState(0)

  const keyword = useDebouncedValue(filters.keyword.trim())

  const params: TaskListParams = {
    ...(keyword && { keyword }),
    ...(filters.status && { status: filters.status }),
    ...(filters.assigneeId !== null && { assigneeId: filters.assigneeId }),
    sort: filters.sort,
    page,
    size: TASK_PAGE_SIZE,
  }

  const tasks = useAsyncData(
    () =>
      getTasks(projectId!, params).then((response) => toTaskPage(response.data.data)),
    projectId !== null ? `tasks-${projectId}-${JSON.stringify(params)}` : null,
    '작업 목록을 불러오지 못했습니다.',
  )

  // 조건을 바꾸면 첫 페이지부터 다시 본다.
  const updateFilters = (next: Partial<TaskFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
    setPage(0)
  }

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS)
    setPage(0)
  }

  const isFiltered =
    filters.keyword.trim() !== '' ||
    filters.status !== null ||
    filters.assigneeId !== null

  const totalCount = tasks.data?.totalCount
  const itemCount = tasks.data?.tasks.length ?? 0

  return {
    tasks: tasks.data?.tasks ?? null,
    totalCount,
    statusCounts: tasks.data?.statusCounts,
    isLoading: tasks.isLoading,
    error: tasks.error,
    reload: tasks.reload,
    filters,
    updateFilters,
    resetFilters,
    isFiltered,
    page,
    setPage,
    // 전체 건수가 오면 그것으로 판단하고, 이전 응답(Task[])이면 한 페이지가 꽉 찼을 때 다음이 있다고 본다.
    hasNextPage:
      totalCount !== undefined
        ? (page + 1) * TASK_PAGE_SIZE < totalCount
        : itemCount === TASK_PAGE_SIZE,
  }
}
