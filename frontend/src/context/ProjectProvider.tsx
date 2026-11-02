import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useMatch } from 'react-router-dom'

import ProjectContext from './ProjectContext'
import { createProject as createProjectApi } from '../api/projectApi'
import { useProjectList } from '../hooks/useProjectList'
import { useProjectMembers } from '../hooks/useProjectMembers'
import type { ProjectCreateRequest } from '../types/project'

// 마지막으로 본 프로젝트를 기억해 다시 들어오면 그 프로젝트로 연다 (설계서 4.1).
// 브라우저 저장소를 못 쓰면 첫 번째 프로젝트로 연다.
const LAST_PROJECT_KEY = 'devflow-last-project'

const readLastProjectId = () => {
  try {
    const value = Number(localStorage.getItem(LAST_PROJECT_KEY))
    return Number.isInteger(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

const saveLastProjectId = (projectId: number) => {
  try {
    localStorage.setItem(LAST_PROJECT_KEY, String(projectId))
  } catch {
    // 저장하지 못해도 화면 동작에는 문제가 없다.
  }
}

function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectList, setProjectList, currentUser, isLoading, error } =
    useProjectList()

  const match = useMatch('/projects/:projectId/*')
  const urlProjectId = match?.params.projectId
    ? Number(match.params.projectId)
    : null

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    () => urlProjectId ?? readLastProjectId(),
  )
  const [prevUrlProjectId, setPrevUrlProjectId] = useState(urlProjectId)

  // URL의 프로젝트가 바뀔 때만 그 프로젝트를 고른 프로젝트로 기억한다.
  // (프로젝트 화면에서 새 프로젝트를 만들어 고른 값을 이전 URL이 덮어쓰지 않게 한다)
  if (urlProjectId !== prevUrlProjectId) {
    setPrevUrlProjectId(urlProjectId)
    if (urlProjectId !== null) setSelectedProjectId(urlProjectId)
  }

  useEffect(() => {
    if (selectedProjectId !== null) saveLastProjectId(selectedProjectId)
  }, [selectedProjectId])

  // URL에 프로젝트가 있으면 그 프로젝트(목록에 없으면 null), 없으면 고른 프로젝트, 그것도 없으면 첫 번째 프로젝트
  const findProject = (projectId: number | null) =>
    projectList.find((project) => project.id === projectId) ?? null

  const currentProject =
    urlProjectId !== null
      ? findProject(urlProjectId)
      : (findProject(selectedProjectId) ?? projectList[0] ?? null)

  // 팀원 목록은 화면마다 따로 부르지 않고 여기서 한 번 받는다.
  const members = useProjectMembers(currentProject?.id ?? null)

  // 저장소 연결 호출은 프로젝트 만들기 모달 단계에서 붙인다 (설계서 3.3).
  const createProject = async (data: ProjectCreateRequest) => {
    const response = await createProjectApi(data)
    const project = response.data.data

    setProjectList((prevProjects) => [project, ...prevProjects])

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
        members: members.members,
        isMembersLoading: members.isLoading,
        membersError: members.error,
        reloadMembers: members.reload,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export default ProjectProvider
