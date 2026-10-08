// 공통 스타일 (CLAUDE.md 디자인 규칙: 버튼 34px, radius 8px, 포커스 outline accent 2px)
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const buttonBase = `inline-flex h-[34px] cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`

export const buttonClass = `${buttonBase} border-line bg-transparent font-medium text-ink hover:bg-hover`

export const primaryButtonClass = `${buttonBase} border-fill bg-fill font-semibold text-onfill hover:brightness-108 disabled:hover:brightness-100`

export const textLinkClass = `text-[13px] text-accent hover:underline ${focusRing}`

// 시안 input/select: 높이 36px, 배경 page, radius 8px
export const fieldClass = `h-9 min-w-0 rounded-lg border border-line bg-page px-3 text-ink placeholder:text-muted ${focusRing}`

// 시안 table: th 12.5px muted, 셀 여백 18px, 내부 구분선 line2
export const thClass = 'border-b border-line2 px-[18px] py-2.5 text-left text-[12.5px] font-medium text-muted'
export const tdClass = 'border-b border-line2 px-[18px] py-3 align-middle'
