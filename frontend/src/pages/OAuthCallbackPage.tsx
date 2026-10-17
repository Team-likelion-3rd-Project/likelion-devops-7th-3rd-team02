import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { exchangeOAuthCode } from '../api/authApi'
import { getMe } from '../api/userApi'
import AuthLayout from '../components/auth/AuthLayout'
import { setAccessToken, setTokenType } from '../utils/authStorage'
import { getErrorMessage } from '../utils/error'
import { setLoggedInUser } from '../utils/loggedInUser'
import { oauthErrorMessage } from '../utils/oauth'

// 소셜 로그인 콜백 (X3): /oauth/callback?code=... 또는 ?error=...
// code는 60초·1회용이라, 들어오자마자 주소에서 지우고 바로 교환한다 (새로고침·뒤로 가기로 다시 쓰지 않게).
function OAuthCallbackPage() {
  const navigate = useNavigate()
  // 개발 모드(StrictMode)에서 효과가 두 번 실행돼도 code는 한 번만 교환한다.
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    window.history.replaceState(null, '', window.location.pathname)

    const backToLogin = (message: string) =>
      navigate('/login', { replace: true, state: { oauthMessage: message } })

    if (error) {
      backToLogin(oauthErrorMessage(error))
      return
    }
    if (!code) {
      navigate('/login', { replace: true })
      return
    }

    const exchange = async () => {
      try {
        const response = await exchangeOAuthCode(code)
        const { accessToken, tokenType } = response.data.data
        setAccessToken(accessToken)
        setTokenType(tokenType)

        // 이메일 로그인과 같은 흐름: 토큰 저장 → 현재 사용자 확인 → 대시보드 (설계서 3.2)
        const meResponse = await getMe()
        setLoggedInUser(meResponse.data.data)
        navigate('/projects', { replace: true })
      } catch (exchangeError) {
        backToLogin(getErrorMessage(exchangeError, oauthErrorMessage('oauth_failed')))
      }
    }

    void exchange()
  }, [navigate])

  return (
    <AuthLayout>
      <p role="status" className="text-muted">
        로그인하는 중이에요.
      </p>
    </AuthLayout>
  )
}

export default OAuthCallbackPage
