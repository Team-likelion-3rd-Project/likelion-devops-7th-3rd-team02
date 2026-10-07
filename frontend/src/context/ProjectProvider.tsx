import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import ProjectContext from './ProjectContext'
import type { ProjectWithDetails } from './ProjectContext'
import {
  createProject as createProjectApi,
  getProjects,
} from '../api/projectApi'
import { getMembers } from '../api/memberApi'
import { getTasks } from '../api/taskApi'
import { getMe } from '../api/userApi'
import { getErrorMessage } from '../utils/error'
import type { ProjectListItem } from '../types/project'
import type { UserMe } from '../types/user'

function formatProjectDate(value: string | null | undefined): string {
  if (!value) return '-'

  const date = new Date(value)
  const today = new Date()

  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )

  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  )

  const diffDays = Math.round(
    (todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'

  return `${date.getMonth() + 1}.${date.getDate()}`
}

type ProjectSource = ProjectListItem &
  Partial<Pick<ProjectWithDetails, 'updatedAt' | 'role' | 'members' | 'tasks'>>

function normalizeProject(project: ProjectSource): ProjectWithDetails {
  return {
    ...project,
    members: project.members ?? [],
    tasks: project.tasks ?? [],
    updatedAt: formatProjectDate(project.updatedAt ?? project.createdAt),
  }
}

function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectList, setProjectList] = useState<ProjectWithDetails[]>([])
  const [currentUser, setCurrentUser] = useState<UserMe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadDashboardData = async () => {
      try {
        const [projectResponse, userResponse] = await Promise.all([
          getProjects(),
          getMe(),
        ])

        const projects = projectResponse.data.data ?? []

        const user = userResponse.data.data ?? null

        const projectsWithDetails = await Promise.all(
          projects.map(async (project) => {
            const [memberResponse, taskResponse] = await Promise.all([
              getMembers(project.id),
              getTasks(project.id),
            ])

            return normalizeProject({
              ...project,
              members: memberResponse.data.data ?? [],
              tasks: taskResponse.data.data ?? [],
            })
          }),
        )

        if (cancelled) return

        setCurrentUser(user)
        setProjectList(projectsWithDetails)
      } catch (error) {
        if (cancelled) return

        setError(getErrorMessage(error, '프로젝트 정보를 불러오지 못했습니다.'))
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    loadDashboardData()

    return () => {
      cancelled = true
    }
  }, [])

  const createProject = async ({
    name,
    description,
  }: {
    name: string
    description?: string
  }) => {
    const response = await createProjectApi({
      name,
      description,
    })

    const project = response.data.data

    const [memberResponse, taskResponse] = await Promise.all([
      getMembers(project.id),
      getTasks(project.id),
    ])

    const newProject = normalizeProject({
      ...project,
      role: 'OWNER',
      members: memberResponse.data.data ?? [],
      tasks: taskResponse.data.data ?? [],
    })

    setProjectList((prevProjects) => [newProject, ...prevProjects])

    return newProject
  }

  return (
    <ProjectContext.Provider
      value={{
        projectList,
        currentUser,
        isLoading,
        error,
        createProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export default ProjectProvider
