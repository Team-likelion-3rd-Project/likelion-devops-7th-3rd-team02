export type ProjectRole = 'OWNER' | 'MEMBER'

// GET /projects
export interface ProjectListItem {
  id: number
  name: string
  description: string | null
  ownerId: number
  ownerName: string
  createdAt: string
}

// GET /projects/{projectId}, POST /projects
export interface Project extends ProjectListItem {
  updatedAt: string
}

export interface ProjectCreateRequest {
  name: string
  description?: string
}
