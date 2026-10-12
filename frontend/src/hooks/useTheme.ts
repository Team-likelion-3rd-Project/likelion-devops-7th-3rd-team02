import { useSyncExternalStore } from 'react'

import { getTheme, setTheme, subscribeTheme } from '../utils/theme'

// 첫 값은 index.html 스크립트가 정한다: 저장된 선택 → 시스템 설정 순
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getTheme)

  return { theme, setTheme }
}
