import { useEffect, useState } from 'react'

// 입력이 멈춘 뒤 delay(ms)가 지나면 값을 반영한다. 검색어 요청 횟수를 줄인다.
export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
