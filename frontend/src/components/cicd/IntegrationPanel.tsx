import { useState } from 'react'
import type { FormEvent } from 'react'

import Panel from '../common/Panel'
import StatusBadge from '../common/StatusBadge'
import { FormError } from '../common/FormField'
import { ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, fieldClass } from '../common/styles'
import { getErrorMessage } from '../../utils/error'

interface IntegrationRowProps {
  provider: string
  value: string | null | undefined
  connectedLabel: string
  emptyMessage: string
  placeholder: string
  isLoading: boolean
  error: string
  onRetry: () => void
  onConnect: (input: string) => Promise<void>
  canConnect: boolean
}

// 연결됨: 경로 + 배지 / 미연결: 입력 영역 (설계서 9.7, 시안 보드 없음)
function IntegrationRow({
  provider,
  value,
  connectedLabel,
  emptyMessage,
  placeholder,
  isLoading,
  error,
  onRetry,
  onConnect,
  canConnect,
}: IntegrationRowProps) {
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (input.trim() === '' || isSubmitting) return

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await onConnect(input.trim())
      setInput('')
    } catch (error) {
      // 등록 오류: 입력 내용을 유지하고 오류를 표시한다 (설계서 5.2).
      setSubmitError(getErrorMessage(error, `${provider} 연결에 실패했습니다.`))
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderValue = () => {
    if (error) return <ErrorMessage message={error} onRetry={onRetry} />
    if (isLoading && value === undefined) return <Loading message="연결 정보를 불러오는 중입니다." />

    if (value) {
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[12.5px]">{value}</span>
          <StatusBadge tone="ok">{connectedLabel}</StatusBadge>
        </span>
      )
    }

    // 연결 등록·해제는 OWNER만 할 수 있다 (Backend 확정). MEMBER에게는 입력 영역을 보여주지 않는다.
    if (!canConnect) {
      return (
        <p className="text-[13px] text-muted">
          {emptyMessage} 연결은 프로젝트 소유자만 할 수 있어요.
        </p>
      )
    }

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">{emptyMessage}</p>
        <div className="flex gap-2">
          <input
            aria-label={`${provider} 연결 정보`}
            placeholder={placeholder}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className={`${fieldClass} flex-1 font-mono text-[12.5px]`}
          />
          <button
            type="submit"
            disabled={input.trim() === '' || isSubmitting}
            className={buttonClass}
          >
            {isSubmitting ? '연결 중...' : '연결'}
          </button>
        </div>
        <FormError message={submitError} />
      </form>
    )
  }

  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] items-start gap-x-3">
      <span className="text-muted">{provider}</span>
      <div className="min-w-0">{renderValue()}</div>
    </div>
  )
}

type RowInput = Omit<
  IntegrationRowProps,
  'provider' | 'connectedLabel' | 'emptyMessage' | 'placeholder' | 'canConnect'
>

// 설계서 4.7 저장소 연결: GitHub 저장소 (파이프라인 C1의 출처)
function IntegrationPanel({ github, canConnect }: { github: RowInput; canConnect: boolean }) {
  return (
    <Panel title="저장소 연결">
      <div className="flex flex-col gap-3.5 px-[18px] py-4">
        <IntegrationRow
          provider="GitHub"
          connectedLabel="연결됨"
          emptyMessage="저장소가 연결되어 있지 않아요."
          placeholder="https://github.com/owner/repo"
          canConnect={canConnect}
          {...github}
        />
      </div>
    </Panel>
  )
}

export default IntegrationPanel
