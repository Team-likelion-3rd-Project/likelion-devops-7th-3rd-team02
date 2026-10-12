export type Theme = 'light' | 'dark'

// index.html의 초기화 스크립트와 같은 키를 쓴다.
export const THEME_STORAGE_KEY = 'devflow-theme'

const listeners = new Set<() => void>()

export const getTheme = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'

// 화면 테마는 기기별 취향이라 localStorage에 둔다 (인증 정보는 sessionStorage).
export const setTheme = (theme: Theme) => {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 저장이 막힌 환경에서는 이번 방문에만 적용한다.
  }

  listeners.forEach((listener) => listener())
}

export const subscribeTheme = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
