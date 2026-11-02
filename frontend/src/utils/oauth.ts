// 소셜 로그인 (Wiki "Backend API 구현 목록" X1~X3)

export type OAuthProvider = 'github' | 'google'

// 버튼은 axios 호출이 아니라 페이지 이동이다. Backend가 제공자 화면으로 보낸 뒤 /oauth/callback으로 돌려보낸다.
export const oauthStartUrl = (provider: OAuthProvider) => `/oauth2/authorization/${provider}`

// 콜백 ?error= 값은 아래 4개뿐이다 (Backend 확정). 사용자 문구는 URL에 넣지 않고 여기서 정한다.
const OAUTH_ERROR_MESSAGE: Record<string, string> = {
  access_denied: '로그인을 취소했어요.',
  email_not_available: '소셜 계정에 인증된 이메일이 없어요. 이메일로 로그인해 주세요.',
  account_conflict: '이 이메일은 다른 소셜 계정에 연결되어 있어요.',
  oauth_failed: '로그인에 실패했어요. 다시 시도해 주세요.',
}

export const oauthErrorMessage = (code: string) =>
  OAUTH_ERROR_MESSAGE[code] ?? OAUTH_ERROR_MESSAGE.oauth_failed
