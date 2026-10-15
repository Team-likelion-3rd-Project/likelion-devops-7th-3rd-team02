import { useContext } from 'react'

import IncidentContext from '../context/IncidentContext'

export function useIncidentContext() {
  const context = useContext(IncidentContext)

  if (!context) {
    throw new Error('useIncidentContext는 IncidentProvider 안에서 사용해야 합니다.')
  }

  return context
}
