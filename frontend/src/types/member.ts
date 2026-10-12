import type { ProjectRole } from './project'

export interface ProjectMember {
  memberId: number
  userId: number
  email: string
  name: string
  role: ProjectRole
}

export interface MemberAddRequest {
  email: string
}
