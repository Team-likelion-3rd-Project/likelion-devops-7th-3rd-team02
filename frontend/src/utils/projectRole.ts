import type { ProjectMember } from '../types/member'
import type { ProjectRole } from '../types/project'

export const getCurrentProjectRole = (
  members: ProjectMember[] | null | undefined,
  userId: number | null | undefined,
): ProjectRole | null => {
  if (!members || !userId) {
    return null
  }

  const currentMember = members.find((member) => member.userId === userId)

  return currentMember?.role ?? null
}
