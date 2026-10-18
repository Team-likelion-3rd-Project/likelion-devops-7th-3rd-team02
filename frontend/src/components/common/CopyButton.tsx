import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { buttonClass } from './styles'

type CopyState = 'idle' | 'copied' | 'failed'

// 값을 클립보드에 복사한다. 결과는 버튼 문구로 알리고 화면 낭독기에도 읽힌다.
function CopyButton({ value, label = '복사' }: { value: string; label?: string }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [state])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      // HTTPS가 아닌 주소 등에서는 클립보드를 쓸 수 없다.
      setState('failed')
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={`${buttonClass} h-[30px] px-2.5 text-[12.5px]`}>
      {state === 'copied' ? (
        <Check aria-hidden="true" size={14} className="text-ok" />
      ) : (
        <Copy aria-hidden="true" size={14} />
      )}
      <span aria-live="polite">
        {state === 'copied' ? '복사됨' : state === 'failed' ? '직접 선택해 복사하세요' : label}
      </span>
    </button>
  )
}

export default CopyButton
