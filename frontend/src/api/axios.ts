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

    // Backend는 인증 실패(토큰 없음·만료)를 401, 권한 부족을 403으로 나눠 반환한다.
    // 401이면 어느 API든 로그인 만료로 보고 로그아웃한다. 403은 권한 부족이라 로그인 상태를 유지한다.
    // 단, 로그인 실패(INVALID_CREDENTIALS)도 401이므로 /auth/ 요청은 제외한다.
    const isAuthRequest = requestUrl.startsWith('/auth/')
    const isAuthFailure = status === 401 && !isAuthRequest

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
