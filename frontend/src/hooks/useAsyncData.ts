import { useEffect, useEffectEvent, useState } from 'react'

import { getErrorCode, getErrorMessage } from '../utils/error'

interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string
  // Backend 오류 코드. 코드에 따라 안내를 바꿀 때 쓴다 (예: CLOUD_NOT_CONNECTED)
  errorCode: string
}

// 패널 하나의 조회 상태 (설계서 5.1, 7.3: 영역별 로딩·오류, 다시 조회 중에도 기존 데이터 유지)
// key가 바뀌면 다시 조회하고, null이면 조회하지 않는다.
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  key: string | null,
  fallbackError: string,
) {
  const [reloadCount, setReloadCount] = useState(0)
  const requestKey = key === null ? null : `${key}#${reloadCount}`

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: requestKey !== null,
    error: '',
    errorCode: '',
  })

  // 요청이 바뀐 렌더에서 바로 로딩 상태로 전환한다.
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey)
  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey)
    setState((prev) => ({ ...prev, isLoading: requestKey !== null, error: '', errorCode: '' }))
  }

  const runFetcher = useEffectEvent(fetcher)

  useEffect(() => {
    if (requestKey === null) return

    let cancelled = false

    runFetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false, error: '', errorCode: '' })
      })
      .catch((error) => {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: getErrorMessage(error, fallbackError),
            errorCode: getErrorCode(error),
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [requestKey, fallbackError])

  const reload = () => setReloadCount((count) => count + 1)

  return { ...state, reload }
}
