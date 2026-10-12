import { useEffect, useState } from 'react'
import axios from 'axios'

import { getProject } from '../api/projectApi'
import { getMembers } from '../api/memberApi'
import { getTasks } from '../api/taskApi'
import { getHealth } from '../api/healthApi'
import { normalizeTask } from '../utils/task'
import type { NormalizedTask } from '../utils/task'
import { getErrorMessage } from '../utils/error'
import type { Project } from '../types/project'
import type { ProjectMember } from '../types/member'

export function useProjectDetailData(projectId: number | string) {
  // Project
  const [projectDetail, setProjectDetail] = useState<Project | null>(null)

  const [isProjectDetailLoading, setIsProjectDetailLoading] = useState(true)

  const [projectDetailError, setProjectDetailError] = useState('')

  // Member
  const [memberList, setMemberList] = useState<ProjectMember[]>([])

  const [isMemberLoading, setIsMemberLoading] = useState(true)

  const [memberError, setMemberError] = useState('')

  // Task
  const [taskList, setTaskList] = useState<NormalizedTask[]>([])

  const [isTaskLoading, setIsTaskLoading] = useState(true)

  const [taskError, setTaskError] = useState('')

  // Health
  const [healthStatus, setHealthStatus] = useState<string | null>(null)

  const [healthHttpStatus, setHealthHttpStatus] = useState<number | null>(null)

  const [isHealthLoading, setIsHealthLoading] = useState(true)

  const [healthError, setHealthError] = useState('')

  useEffect(() => {
    let cancelled = false

    getProject(projectId)
      .then((response) => {
        if (cancelled) return

        setProjectDetail(response.data.data ?? null)
        setProjectDetailError('')
      })
      .catch((error) => {
        if (cancelled) return

        setProjectDetailError(
          getErrorMessage(error, '프로젝트 상세 정보를 불러오지 못했습니다.'),
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsProjectDetailLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    getMembers(projectId)
      .then((response) => {
        if (cancelled) return

        setMemberList(response.data.data ?? [])
        setMemberError('')
      })
      .catch((error) => {
        if (cancelled) return

        setMemberError(
          getErrorMessage(error, '프로젝트 멤버를 불러오지 못했습니다.'),
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsMemberLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    getTasks(projectId)
      .then((response) => {
        if (cancelled) return

        const tasks = response.data.data ?? []

        setTaskList(tasks.map(normalizeTask))
        setTaskError('')
      })
      .catch((error) => {
        if (cancelled) return

        setTaskError(getErrorMessage(error, '작업 목록을 불러오지 못했습니다.'))
      })
      .finally(() => {
        if (!cancelled) {
          setIsTaskLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false

    getHealth()
      .then((response) => {
        if (cancelled) return

        setHealthStatus(response.data?.status ?? 'UNKNOWN')
        setHealthHttpStatus(response.status)
        setHealthError('')
      })
      .catch((error) => {
        if (cancelled) return

        setHealthStatus('DOWN')
        setHealthHttpStatus(
          axios.isAxiosError(error) ? (error.response?.status ?? null) : null,
        )
        setHealthError('Backend Health Check에 실패했습니다.')
      })
      .finally(() => {
        if (!cancelled) {
          setIsHealthLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    projectDetail,
    isProjectDetailLoading,
    projectDetailError,

    memberList,
    setMemberList,
    isMemberLoading,
    memberError,

    taskList,
    setTaskList,
    isTaskLoading,
    taskError,

    healthStatus,
    healthHttpStatus,
    isHealthLoading,
    healthError,
  }
}
