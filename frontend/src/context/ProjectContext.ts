import { createContext } from 'react'
import type {
  Project,
  ProjectCreateRequest,
  ProjectListItem,
} from '../types/project'
import type { ProjectMember } from '../types/member'
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
  // 현재 프로젝트의 팀원. 사이드바·작업 보드·모니터링·팀원 모달이 한 번 받아 함께 쓴다.
  members: ProjectMember[]
  isMembersLoading: boolean
  membersError: string
  reloadMembers: () => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export default ProjectContext
