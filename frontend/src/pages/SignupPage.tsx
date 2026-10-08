import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { signup } from '../api/authApi'
import AuthLayout from '../components/auth/AuthLayout'
import AuthField from '../components/auth/AuthField'
import FormNotice from '../components/auth/FormNotice'
import { focusRing, primaryButtonClass } from '../components/auth/authStyles'
import { getErrorMessage } from '../utils/error'

const PASSWORD_MIN_LENGTH = 8

// 설계서 4.3: 2차 회원가입과 동일. 시안이 없어 로그인 화면 구성을 따른다.
function SignupPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isPasswordTooShort =
    password !== '' && password.length < PASSWORD_MIN_LENGTH
  const isPasswordMismatch =
    passwordConfirm !== '' && password !== passwordConfirm

  const isFormValid =
    name.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    passwordConfirm !== '' &&
    !isPasswordMismatch

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isFormValid || isLoading) {
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    try {
      await signup({
        email: email.trim(),
        password,
        name: name.trim(),
      })

      navigate('/login')
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
        <h2 className="text-[22px] font-bold tracking-[-0.02em]">회원가입</h2>

        <AuthField
          id="name"
          label="이름"
          placeholder="이름을 입력하세요."
          autoComplete="name"
          value={name}
          onChange={setName}
        />

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
          placeholder="비밀번호를 입력하세요."
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          errorMessage={
            isPasswordTooShort
              ? `비밀번호는 최소 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`
              : undefined
          }
        />

        <AuthField
          id="passwordConfirm"
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 다시 입력하세요."
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          errorMessage={
            isPasswordMismatch ? '비밀번호가 일치하지 않습니다.' : undefined
          }
        />

        {errorMessage && <FormNotice tone="err">{errorMessage}</FormNotice>}

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className={primaryButtonClass}
        >
          {isLoading ? '회원가입 중...' : '회원가입'}
        </button>

        <p className="text-center text-muted">
          이미 계정이 있나요?{' '}
          <Link to="/login" className={`text-accent underline ${focusRing}`}>
            로그인
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

export default SignupPage
