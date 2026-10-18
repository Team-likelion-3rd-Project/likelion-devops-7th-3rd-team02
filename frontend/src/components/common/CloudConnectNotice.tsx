import { Link } from 'react-router-dom'

import Panel from './Panel'
import { primaryButtonClass } from './styles'

// 클라우드 연결이 없어 운영 상태를 볼 수 없을 때 (Backend 14.2 CLOUD_NOT_CONNECTED)
// 연결은 OWNER만 할 수 있어 MEMBER에게는 버튼 대신 요청 안내를 보여준다.
function CloudConnectNotice({
  projectId,
  canConnect,
  title = '운영 상태',
  message = '클라우드를 연결하면 배포 상태, 파드, 지표가 보여요.',
  className = '',
}: {
  projectId: number
  canConnect: boolean
  title?: string
  message?: string
  className?: string
}) {
  return (
    <Panel title={title} className={className}>
      <div className="flex flex-col items-center gap-3 px-[18px] py-10 text-center text-[13px] text-muted">
        <p className="max-w-[46ch] break-keep">{message}</p>
        {canConnect ? (
          <Link to={`/projects/${projectId}/settings#cloud`} className={primaryButtonClass}>
            설정에서 연결하기
          </Link>
        ) : (
          <p>연결은 프로젝트 소유자에게 요청해 주세요.</p>
        )}
      </div>
    </Panel>
  )
}

export default CloudConnectNotice
