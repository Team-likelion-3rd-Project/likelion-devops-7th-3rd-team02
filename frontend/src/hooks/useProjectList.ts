import { useEffect, useState } from 'react'

import { getProjects } from '../api/projectApi'
import { getMe } from '../api/userApi'
import { getErrorMessage } from '../utils/error'
import type { ProjectListItem } from '../types/project'
import type { UserMe } from '../types/user'

// 공통 Layout에 필요한 프로젝트 목록과 현재 사용자 (설계서 4.1, 10.3)
export function useProjectList() {
  const [projectList, setProjectList] = useState<ProjectListItem[]>([])
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([getProjects(), getMe()])
      .then(([projectResponse, userResponse]) => {
        if (cancelled) return

        setProjectList(projectResponse.data.data ?? [])
        setCurrentUser(userResponse.data.data ?? null)
        setError('')
      })
      .catch((error) => {
        if (cancelled) return

        setError(getErrorMessage(error, '프로젝트 정보를 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    projectList,
    setProjectList,
    currentUser,
    isLoading,
    error,
  }
}
