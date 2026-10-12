import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { login } from '../api/authApi'
import { getMe } from '../api/userApi'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import FormNotice from '../components/auth/FormNotice'
import { focusRing, primaryButtonClass } from '../components/auth/authStyles'
import { setAccessToken, setTokenType } from '../utils/authStorage'
import { getErrorMessage } from '../utils/error'
import { setLoggedInUser } from '../utils/loggedInUser'

// 설계서 4.2 로그인 화면. GitHub 로그인(P3)은 구현 전이라 버튼을 표시하지 않는다.
function LoginPage() {
  const navigate = useNavigate()

  const [searchParams] = useSearchParams()
  const isSessionExpired = searchParams.get('reason') === 'expired'

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
        {isSessionExpired && !errorMessage && (
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
