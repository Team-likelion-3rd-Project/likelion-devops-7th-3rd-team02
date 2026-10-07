import { createContext } from 'react'
import type { ProjectListItem, ProjectRole } from '../types/project'
import type { ProjectMember } from '../types/member'
import type { Task } from '../types/task'
import type { UserMe } from '../types/user'

export interface ProjectWithDetails extends ProjectListItem {
  updatedAt: string
  role?: ProjectRole
  members: ProjectMember[]
  tasks: Task[]
}

export interface ProjectContextValue {
  projectList: ProjectWithDetails[]
  currentUser: UserMe | null
  isLoading: boolean
  error: string
  createProject: (data: {
    name: string
    description?: string
  }) => Promise<ProjectWithDetails>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export default ProjectContext
