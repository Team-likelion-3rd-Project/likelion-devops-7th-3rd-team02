// 설계서 6.5, 6.6 저장소 연결. 필드명은 Backend 확정 전 가정이다.
// 접근 토큰 입력 여부는 Backend 답변 대기 (10.2)라 요청에 넣지 않는다.

// GET /projects/{projectId}/github/repository (계획)
export interface GithubRepository {
  fullName: string
  url: string
}

// POST /projects/{projectId}/integrations/github (계획)
export interface GithubConnectRequest {
  repositoryUrl: string
}

// GET·POST /projects/{projectId}/integrations/gitlab (확정)
export interface GitlabIntegration {
  projectPath: string
}

export interface GitlabConnectRequest {
  projectPath: string
}
