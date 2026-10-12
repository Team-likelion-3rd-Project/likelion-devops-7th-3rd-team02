import { useState } from 'react'

import { getTasks } from '../api/taskApi'
import { useAsyncData } from './useAsyncData'
import { useDebouncedValue } from './useDebouncedValue'
import type { TaskListParams, TaskStatus } from '../types/task'

// 설계서 4.5: 한 페이지 12건, 기본 정렬 최근 수정순 (마감일 정렬 없음)
export const TASK_PAGE_SIZE = 12

// sort 허용 값은 Backend 확인 전 (10.2). Spring Pageable 형식을 가정한다.
export const TASK_SORT_OPTIONS = [
  { value: 'updatedAt,desc', label: '최근 수정순' },
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
      getTasks(projectId!, params).then((response) => response.data.data ?? []),
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

  return {
    tasks: tasks.data,
    isLoading: tasks.isLoading,
    error: tasks.error,
    reload: tasks.reload,
    filters,
    updateFilters,
    resetFilters,
    isFiltered,
    page,
    setPage,
    // 목록 응답의 전체 건수 포함 여부는 Backend 확인 전 (10.2). 한 페이지가 꽉 차면 다음이 있다고 본다.
    hasNextPage: (tasks.data?.length ?? 0) === TASK_PAGE_SIZE,
  }
}
