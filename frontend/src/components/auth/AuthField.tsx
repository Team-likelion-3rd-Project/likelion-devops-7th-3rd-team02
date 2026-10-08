import { useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'

import { iconButtonClass, inputClass } from './authStyles'

interface AuthFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  // 2차 동작 유지: 이메일은 지우기 버튼, 비밀번호는 보기 전환 버튼
  clearable?: boolean
  errorMessage?: string
}

function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  clearable = false,
  errorMessage,
  ...inputProps
}: AuthFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const isPassword = type === 'password'
  const hasButton = isPassword || (clearable && value !== '')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isPassword && isPasswordVisible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={errorMessage ? true : undefined}
          className={`${inputClass} ${hasButton ? 'pr-10' : ''} ${
            errorMessage ? 'border-err' : ''
          }`}
          {...inputProps}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={
              isPasswordVisible ? `${label} 숨기기` : `${label} 보기`
            }
            className={iconButtonClass}
          >
            {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {!isPassword && clearable && value !== '' && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={`${label} 지우기`}
            className={iconButtonClass}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="text-[12.5px] text-err">{errorMessage}</p>
      )}
    </div>
  )
}

export default AuthField
