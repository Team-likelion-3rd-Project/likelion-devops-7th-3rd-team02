// 설계서 6.5 GitHub 저장소 연결 (Backend 확정 G1·G2). 토큰은 받지 않고 서버 공용 토큰을 쓴다.
// GitLab 연동과 GitHub 이슈·PR 연동은 3차 범위에서 제외했다 (Backend 2026-10-14~15 결정).

// GET /projects/{projectId}/github/repository — 연결 전에는 data: null
export interface GithubRepository {
  fullName: string
  url: string
}

// POST /projects/{projectId}/integrations/github (OWNER)
export interface GithubConnectRequest {
  repositoryUrl: string
}
