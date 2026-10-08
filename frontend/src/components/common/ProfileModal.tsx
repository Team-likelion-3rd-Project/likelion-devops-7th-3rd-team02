import { Mail, User, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import Modal from './Modal'
import { primaryButtonClass } from './styles'
import type { UserMe } from '../../types/user'

function InfoRow({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-line2 py-3 last:border-b-0">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-page text-muted">
        <Icon size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <span className="block text-[12.5px] text-muted">{label}</span>
        <b className="block truncate font-medium">{value}</b>
      </div>
    </div>
  )
}

// 프로필 모달 (설계서 1.2: 2차 유지, GET /users/me). 3차에서는 Sidebar 사용자 영역에서 연다 (10.3).
function ProfileModal({ user, onClose }: { user: UserMe; onClose: () => void }) {
  return (
    <Modal
      title="내 프로필"
      description="현재 로그인한 사용자 정보입니다."
      onClose={onClose}
      maxWidth="max-w-[420px]"
      footer={
        <button type="button" onClick={onClose} autoFocus className={primaryButtonClass}>
          확인
        </button>
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent-bg text-[17px] font-bold text-accent"
        >
          {user.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <b className="block truncate font-semibold">{user.name}</b>
          <span className="block truncate text-[13px] text-muted">{user.email}</span>
        </div>
      </div>

      <div className="rounded-xl border border-line2 px-3.5">
        <InfoRow Icon={UserRound} label="이름" value={user.name} />
        <InfoRow Icon={Mail} label="이메일" value={user.email} />
        <InfoRow Icon={User} label="User ID" value={String(user.userId)} />
      </div>
    </Modal>
  )
}

export default ProfileModal
