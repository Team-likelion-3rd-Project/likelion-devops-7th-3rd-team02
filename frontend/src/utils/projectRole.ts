import type { ProjectListItem, ProjectRole } from '../types/project'

// 시안 표기: 소유자 / 멤버
export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  OWNER: '소유자',
  MEMBER: '멤버',
}

// 내가 이 프로젝트의 OWNER인지. 응답의 role을 쓰고, Backend 반영 전에는 2차 방식(ownerId 비교)으로 대신한다 (설계서 2.3).
export const isProjectOwner = (project: ProjectListItem | null, userId: number | undefined) => {
  if (!project) return false
  if (project.role) return project.role === 'OWNER'
  return project.ownerId === userId
}
