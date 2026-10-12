export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const toDate = (value: string | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

// 마지막 수집 14:32:08
export const formatClock = (value: string | null | undefined): string => {
  const date = toDate(value)
  if (!date) return '-'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// 12분 전 / 어제 18:05 / 10.3 18:05 (시안 최근 배포 표기)
export const formatRelativeTime = (
  value: string | null | undefined,
  now: Date = new Date(),
): string => {
  const date = toDate(value)
  if (!date) return '-'

  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

  if (date >= startOfToday) return `${Math.floor(diffMinutes / 60)}시간 전`
  if (date >= startOfYesterday) return `어제 ${time}`

  return `${date.getMonth() + 1}.${date.getDate()} ${time}`
}

// 소요 시간: 1분 12초 / 48초 (시작·완료 시각 차이, 설계서 4.7)
export const formatDuration = (
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
  now: Date = new Date(),
): string => {
  const start = toDate(startedAt)
  if (!start) return '-'

  const end = toDate(finishedAt) ?? now
  const totalSeconds = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}초`
  return `${minutes}분 ${pad(seconds)}초`
}

// 오늘 14:20 / 어제 18:05 / 10.3 18:05 (이력 표 표기)
export const formatDayTime = (
  value: string | null | undefined,
  now: Date = new Date(),
): string => {
  const date = toDate(value)
  if (!date) return '-'

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000)

  if (date >= startOfToday) return time
  if (date >= startOfYesterday) return `어제 ${time}`
  return `${date.getMonth() + 1}.${date.getDate()} ${time}`
}

export const shortSha = (sha: string | null | undefined) => (sha ? sha.slice(0, 7) : '-')

// 경과 표기: 12분 전 / 3시간 전 / 2일 전 (파드 생성)
export const formatAge = (
  value: string | null | undefined,
  now: Date = new Date(),
): string => {
  const date = toDate(value)
  if (!date) return '-'

  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`
  return `${Math.floor(minutes / (60 * 24))}일 전`
}

// 14:20부터 12분째 (장애 발생 후 경과)
export const formatSince = (
  value: string | null | undefined,
  now: Date = new Date(),
): string => {
  const date = toDate(value)
  if (!date) return '-'

  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000))
  const elapsed =
    minutes < 60 ? `${minutes}분째` : minutes < 60 * 24 ? `${Math.floor(minutes / 60)}시간째` : `${Math.floor(minutes / (60 * 24))}일째`
  return `${formatDayTime(value, now)}부터 ${elapsed}`
}

// 마지막 수집 시각이 오래됐는지 (설계서 5.5). 기준 시간은 팀과 확정 전이라 5분으로 둔다.
export const STALE_AFTER_MINUTES = 5

export const isStale = (value: string | null | undefined, now: Date = new Date()) => {
  const date = toDate(value)
  if (!date) return false
  return now.getTime() - date.getTime() > STALE_AFTER_MINUTES * 60 * 1000
}
