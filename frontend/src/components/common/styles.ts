// 공통 스타일 (CLAUDE.md 디자인 규칙: 버튼 34px, radius 8px, 포커스 outline accent 2px)
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const buttonBase = `inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`

export const buttonClass = `${buttonBase} border-line bg-transparent font-medium text-ink hover:bg-hover`

export const primaryButtonClass = `${buttonBase} border-fill bg-fill font-semibold text-onfill hover:brightness-108 disabled:hover:brightness-100`

export const textLinkClass = `text-[13px] text-accent hover:underline ${focusRing}`
