import type { ProjectListItem, ProjectRole } from '../types/project'

// 시안 표기: 소유자 / 멤버
export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  OWNER: '소유자',
  MEMBER: '멤버',
}

// 내가 이 프로젝트의 OWNER인지. 프로젝트 응답의 role을 쓴다 (설계서 2.3, Backend 확정)
export const isProjectOwner = (project: ProjectListItem | null) => project?.role === 'OWNER'

// 역할 표시: 소유자 / 멤버
export const projectRoleLabel = (project: ProjectListItem) => PROJECT_ROLE_LABEL[project.role]
