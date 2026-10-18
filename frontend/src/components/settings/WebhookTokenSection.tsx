import { useState } from 'react'

import CopyButton from '../common/CopyButton'
import Modal from '../common/Modal'
import { FormError } from '../common/FormField'
import { ErrorMessage, Loading } from '../common/PanelState'
import { buttonClass, primaryButtonClass } from '../common/styles'
import { issueWebhookToken } from '../../api/cloudApi'
import { formatDate, formatRelativeTime } from '../../utils/date'
import { getErrorMessage } from '../../utils/error'
import type { WebhookTokenSummary, WebhookTokenType } from '../../types/cloud'

const codeClass =
  'overflow-x-auto rounded-lg border border-line2 bg-page px-3 py-2.5 font-mono text-[12px] leading-[1.6] whitespace-pre'

// 설정 > 배포 기록·장애 알림: 프로젝트 Webhook 토큰(WT1·WT2, OWNER 전용)
// 토큰 원문은 발급 응답에서 한 번만 오므로 이 컴포넌트 상태에만 두고, 저장소·로그에 남기지 않는다.
function WebhookTokenSection({
  projectId,
  type,
  token,
  isLoading,
  error,
  onRetry,
  onIssued,
  canEdit,
  usage,
}: {
  projectId: number
  type: WebhookTokenType
  token: WebhookTokenSummary | null
  isLoading: boolean
  error: string
  onRetry: () => void
  onIssued: () => void
  canEdit: boolean
  usage: string
}) {
  const [issuedToken, setIssuedToken] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [issueError, setIssueError] = useState('')

  if (!canEdit) {
    return <p className="text-[13px] text-muted">토큰은 프로젝트 소유자만 발급하고 확인할 수 있어요.</p>
  }

  if (error) return <ErrorMessage message={error} onRetry={onRetry} />
  if (isLoading && token === null && !issuedToken) return <Loading message="토큰 정보를 불러오는 중입니다." />

  const issue = async () => {
    setIsIssuing(true)
    setIssueError('')

    try {
      const response = await issueWebhookToken(projectId, type)
      setIssuedToken(response.data.data.token)
      setIsConfirmOpen(false)
      onIssued()
    } catch (error) {
      setIssueError(getErrorMessage(error, '토큰을 발급하지 못했습니다.'))
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <>
      {token ? (
        <p className="text-[13px] text-muted">
          {formatDate(token.createdAt)}에 발급했어요.{' '}
          {token.lastUsedAt
            ? `마지막 사용 ${formatRelativeTime(token.lastUsedAt)}`
            : '아직 이 토큰으로 받은 기록은 없어요.'}
        </p>
      ) : (
        <p className="text-[13px] text-muted">아직 발급한 토큰이 없어요.</p>
      )}

      {issuedToken && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-warn bg-warn-bg px-3.5 py-3">
          <p className="text-[13px] font-semibold text-warn">
            이 토큰은 지금만 볼 수 있어요. 복사해서 안전한 곳(CI 비밀값 등)에 저장하세요.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 rounded-md bg-panel px-2.5 py-1.5 font-mono text-[12.5px] break-all">
              {issuedToken}
            </code>
            <CopyButton value={issuedToken} label="토큰 복사" />
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={() => (token ? setIsConfirmOpen(true) : issue())}
          disabled={isIssuing}
          className={token ? buttonClass : primaryButtonClass}
        >
          {isIssuing ? '발급 중...' : token ? '다시 발급' : '토큰 발급'}
        </button>
      </div>
      {!isConfirmOpen && <FormError message={issueError} />}

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium">설정 예시</span>
        <pre className={codeClass}>{usage}</pre>
      </div>

      {isConfirmOpen && (
        <Modal
          title="토큰을 다시 발급할까요?"
          description="다시 발급하면 지금 쓰고 있는 토큰은 바로 막혀요. 새 토큰으로 바꿔 넣기 전까지 기록을 받지 못해요."
          onClose={() => setIsConfirmOpen(false)}
          maxWidth="max-w-[460px]"
          footer={
            <>
              <button type="button" onClick={() => setIsConfirmOpen(false)} className={buttonClass}>
                취소
              </button>
              <button type="button" onClick={issue} disabled={isIssuing} className={primaryButtonClass}>
                {isIssuing ? '발급 중...' : '다시 발급'}
              </button>
            </>
          }
        >
          <FormError message={issueError} />
        </Modal>
      )}
    </>
  )
}

export default WebhookTokenSection
