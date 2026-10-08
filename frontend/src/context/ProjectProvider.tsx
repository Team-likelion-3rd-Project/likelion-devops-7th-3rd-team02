import { useState } from 'react'
import type { ReactNode } from 'react'
import { useMatch } from 'react-router-dom'

import ProjectContext from './ProjectContext'
import { createProject as createProjectApi } from '../api/projectApi'
import { useProjectList } from '../hooks/useProjectList'
import type { ProjectCreateRequest } from '../types/project'

function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectList, setProjectList, currentUser, isLoading, error } =
    useProjectList()

  const match = useMatch('/projects/:projectId/*')
  const urlProjectId = match?.params.projectId
    ? Number(match.params.projectId)
    : null

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null,
  )

  // 프로젝트 하위 화면으로 이동하면 그 프로젝트를 현재 프로젝트로 기억한다.
  if (urlProjectId !== null && urlProjectId !== selectedProjectId) {
    setSelectedProjectId(urlProjectId)
  }

  const currentProjectId =
    urlProjectId ?? selectedProjectId ?? projectList[0]?.id ?? null

  const currentProject =
    projectList.find((project) => project.id === currentProjectId) ?? null

  // 저장소 연결 호출은 프로젝트 만들기 모달 단계에서 붙인다 (설계서 3.3).
  const createProject = async (data: ProjectCreateRequest) => {
    const response = await createProjectApi(data)
    const project = response.data.data

    setProjectList((prevProjects) => [
      { ...project, role: project.role ?? 'OWNER' },
      ...prevProjects,
    ])

    return project
  }

  return (
    <ProjectContext.Provider
      value={{
        projectList,
        currentUser,
        currentProject,
        selectProject: setSelectedProjectId,
        isLoading,
        error,
        createProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export default ProjectProvider
