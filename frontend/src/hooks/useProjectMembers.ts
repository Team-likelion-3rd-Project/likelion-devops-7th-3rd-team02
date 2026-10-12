import { getMembers } from '../api/memberApi'
import { useAsyncData } from './useAsyncData'

// 팀원 목록: 담당자 필터, 업무 추가·수정, 장애 담당자 선택이 함께 쓴다 (설계서 6.3, 7.3)
export function useProjectMembers(projectId: number | null) {
  const members = useAsyncData(
    () => getMembers(projectId!).then((response) => response.data.data ?? []),
    projectId !== null ? `members-${projectId}` : null,
    '팀원 목록을 불러오지 못했습니다.',
  )

  return {
    members: members.data ?? [],
    isLoading: members.isLoading,
    error: members.error,
    reload: members.reload,
  }
}
