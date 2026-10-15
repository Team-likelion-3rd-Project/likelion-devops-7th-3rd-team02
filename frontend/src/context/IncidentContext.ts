import { createContext } from 'react'

import type { MyIncidentListResponse } from '../types/incident'

// 내가 팀원인 모든 프로젝트의 장애 (I7). 사이드바 배지와 전체 장애 화면이 함께 쓴다 (설계서 4.1, 4.11).
export interface IncidentContextValue {
  data: MyIncidentListResponse | null
  isLoading: boolean
  error: string
  reload: () => void
}

const IncidentContext = createContext<IncidentContextValue | null>(null)

export default IncidentContext
