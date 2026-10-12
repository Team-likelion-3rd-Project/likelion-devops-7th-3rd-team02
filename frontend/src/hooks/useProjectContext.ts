import { useContext } from 'react'

import ProjectContext from '../context/ProjectContext'

export function useProjectContext() {
  const context = useContext(ProjectContext)

  if (!context) {
    throw new Error('useProjectContext는 ProjectProvider 안에서 사용해야 합니다.')
  }

  return context
}
