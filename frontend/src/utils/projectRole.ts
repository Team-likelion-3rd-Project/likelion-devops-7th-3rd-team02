import type { ProjectRole } from '../types/project'

// 시안 표기: 소유자 / 멤버
export const PROJECT_ROLE_LABEL: Record<ProjectRole, string> = {
  OWNER: '소유자',
  MEMBER: '멤버',
}
