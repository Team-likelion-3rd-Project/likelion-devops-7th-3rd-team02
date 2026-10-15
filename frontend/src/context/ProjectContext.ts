import { createContext } from 'react'
import type {
  Project,
  ProjectCreateRequest,
  ProjectListItem,
} from '../types/project'
import type { UserMe } from '../types/user'

export interface ProjectContextValue {
  projectList: ProjectListItem[]
  currentUser: UserMe | null
  // 현재 프로젝트: URL의 projectId, 없으면 사이드바에서 고른(마지막으로 본) 프로젝트, 없으면 첫 번째 (설계서 4.1)
  currentProject: ProjectListItem | null
  selectProject: (projectId: number) => void
  isLoading: boolean
  error: string
  createProject: (data: ProjectCreateRequest) => Promise<Project>
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export default ProjectContext
