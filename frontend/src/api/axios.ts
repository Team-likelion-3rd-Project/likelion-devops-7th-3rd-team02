import axios from 'axios'

import {
  getAccessToken,
  getTokenType,
  clearAuthStorage,
} from '../utils/authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 목 모드 (npm run dev:mock): Backend 없이 화면을 확인하려고 가짜 응답을 쓴다.
// 일반 개발·배포 빌드에서는 이 분기가 빠지고 목 코드도 번들에 들어가지 않는다.
if (import.meta.env.MODE === 'mock') {
  api.defaults.adapter = async (config) => {
    const { mockAdapter } = await import('../mocks/mockApi')
    return mockAdapter(config)
  }
}

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  const tokenType = getTokenType()

  if (accessToken) {
    config.headers.Authorization = `${tokenType} ${accessToken}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl: string = error.config?.url ?? ''

    // 현재 Backend는 인증 실패와 권한 부족을 모두 403으로 반환한다.
    // /users/me 는 앱 진입 시 항상 호출되므로, 여기서의 실패만
    // 저장된 토큰이 무효한 경우로 판단한다.
    // 개별 기능 요청의 403은 권한 부족이므로 로그인 상태를 유지한다.
    const isMeRequest = requestUrl.includes('/users/me')
    const isAuthFailure = (status === 401 || status === 403) && isMeRequest

    if (isAuthFailure) {
      clearAuthStorage()

      if (window.location.pathname !== '/login') {
        window.location.replace('/login?reason=expired')
      }
    }

    return Promise.reject(error)
  },
)

export default api
