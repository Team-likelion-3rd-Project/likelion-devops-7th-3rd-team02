import { shortSha } from '../../utils/date'

// 커밋 SHA와 메시지. 메시지는 Backend가 못 가져오면 null이라 SHA만 보여준다.
function CommitLabel({ sha, message }: { sha: string; message?: string | null }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 font-mono text-[12.5px]">{shortSha(sha)}</span>
      {message && (
        <span title={message} className="max-w-[280px] truncate">
          {message}
        </span>
      )}
    </span>
  )
}

export default CommitLabel
