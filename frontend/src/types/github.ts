// GET /projects/{projectId}/github/issues (설계서 6.5 계획)
// 필드명과 "이미 가져옴" 표시 방식은 Backend 확정 전 가정이다 (설계서 9.5).
export interface GithubIssue {
  id: number
  number: number
  title: string
  url: string
  imported: boolean
}
