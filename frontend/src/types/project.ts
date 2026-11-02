export type ProjectRole = 'OWNER' | 'MEMBER'

// GET /projects
export interface ProjectListItem {
  id: number
  name: string
  description: string | null
  ownerId: number
  ownerName: string
  createdAt: string
  // 현재 사용자의 역할 (설계서 6.2, Backend 확정)
  role: ProjectRole
}

// GET /projects/{projectId}, POST /projects
export interface Project extends ProjectListItem {
  updatedAt: string
}

export interface ProjectCreateRequest {
  name: string
  description?: string
}
