import { useEffect, useEffectEvent } from 'react'
import type { ReactNode } from 'react'

import IncidentContext from './IncidentContext'
import { getMyIncidents } from '../api/incidentApi'
import { useAsyncData } from '../hooks/useAsyncData'
import { INCIDENTS_CHANGED_EVENT } from '../utils/monitoring'

// 1분마다 다시 불러오되 탭이 보이지 않으면 멈추고, 다시 보이면 바로 한 번 불러온다 (Backend 권장).
const REFRESH_INTERVAL_MS = 60 * 1000

function IncidentProvider({ children }: { children: ReactNode }) {
  const incidents = useAsyncData(
    () => getMyIncidents().then((response) => response.data.data),
    'my-incidents',
    '전체 장애를 불러오지 못했습니다.',
  )

  const reload = useEffectEvent(() => incidents.reload())

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) reload()
    }, REFRESH_INTERVAL_MS)

    const handleVisibility = () => {
      if (!document.hidden) reload()
    }
    const handleChanged = () => reload()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener(INCIDENTS_CHANGED_EVENT, handleChanged)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener(INCIDENTS_CHANGED_EVENT, handleChanged)
    }
  }, [])

  return (
    <IncidentContext.Provider
      value={{
        data: incidents.data,
        isLoading: incidents.isLoading,
        error: incidents.error,
        reload: incidents.reload,
      }}
    >
      {children}
    </IncidentContext.Provider>
  )
}

export default IncidentProvider
