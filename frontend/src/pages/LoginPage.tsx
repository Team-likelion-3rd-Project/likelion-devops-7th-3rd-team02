import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { login } from '../api/authApi'
import { getMe } from '../api/userApi'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import FormNotice from '../components/auth/FormNotice'
import { GithubMark, GoogleMark } from '../components/auth/ProviderIcons'
import { focusRing, primaryButtonClass, secondaryButtonClass } from '../components/auth/authStyles'
import { setAccessToken, setTokenType } from '../utils/authStorage'
import { getErrorMessage } from '../utils/error'
import { setLoggedInUser } from '../utils/loggedInUser'
import { oauthStartUrl } from '../utils/oauth'

// 설계서 4.2 로그인 화면: 이메일 로그인 + GitHub·Google로 계속하기 (X1~X3)
// 소셜 로그인이 실패하면 콜백 화면이 안내 문구를 state로 넘겨 준다.
function LoginPage() {
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const isSessionExpired = searchParams.get('reason') === 'expired'
  const location = useLocation()
  const oauthMessage = (location.state as { oauthMessage?: string } | null)?.oauthMessage ?? ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isFormValid = email.trim() !== '' && password !== ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isFormValid || isLoading) {
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      const response = await login({
        email: email.trim(),
        password,
      })

      const { accessToken, tokenType } = response.data.data

      setAccessToken(accessToken)
      setTokenType(tokenType)

      // 설계서 3.2: 토큰 저장 → 현재 사용자 확인 → 대시보드 이동
      const meResponse = await getMe()
      setLoggedInUser(meResponse.data.data)

      navigate('/projects')
    } catch (error) {
      setErrorMessage(getErrorMessage(error, '요청 처리 중 오류가 발생했습니다.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex w-full max-w-[380px] flex-col gap-4"
      >
        {oauthMessage && !errorMessage && <FormNotice tone="err">{oauthMessage}</FormNotice>}

        {isSessionExpired && !errorMessage && !oauthMessage && (
          <FormNotice tone="warn">
            <b className="font-semibold">로그인이 만료됐어요.</b>
            다시 로그인해 주세요.
          </FormNotice>
        )}

        <h2 className="text-[22px] font-bold tracking-[-0.02em]">로그인</h2>

        <AuthField
          id="email"
          label="이메일"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          clearable
        />

        <AuthField
          id="password"
          label="비밀번호"
          type="password"
          placeholder="비밀번호"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />

        {errorMessage && <FormNotice tone="err">{errorMessage}</FormNotice>}

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={primaryButtonClass}
        >
          {isLoading ? '로그인 중...' : '로그인'}
        </button>

        <div className="flex items-center gap-3 text-[13px] text-muted">
          <span aria-hidden="true" className="h-px flex-1 bg-line2" />
          또는
          <span aria-hidden="true" className="h-px flex-1 bg-line2" />
        </div>

        {/* 페이지 이동이라 링크로 둔다. Backend가 제공자 화면으로 보낸 뒤 /oauth/callback으로 돌려보낸다. */}
        <div className="flex flex-col gap-2.5">
          <a href={oauthStartUrl('github')} className={secondaryButtonClass}>
            <GithubMark />
            GitHub로 계속하기
          </a>
          <a href={oauthStartUrl('google')} className={secondaryButtonClass}>
            <GoogleMark />
            Google로 계속하기
          </a>
        </div>

        <p className="text-center text-muted">
          계정이 없나요?{' '}
          <Link to="/signup" className={`text-accent underline ${focusRing}`}>
            회원가입
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
