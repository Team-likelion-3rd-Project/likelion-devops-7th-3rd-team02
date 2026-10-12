import { focusRing } from '../common/styles'

export { focusRing }

// 로그인·회원가입 폼 공통 스타일 (시안 LoginLight: 입력·버튼 높이 42px)
export const inputClass = `h-[42px] w-full min-w-0 rounded-lg border border-line bg-page px-3 text-ink placeholder:text-muted ${focusRing}`

export const primaryButtonClass = `inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-lg border border-fill bg-fill px-3.5 font-semibold text-onfill hover:brightness-108 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100 ${focusRing}`

export const iconButtonClass = `absolute top-1/2 right-2.5 flex -translate-y-1/2 cursor-pointer items-center rounded text-muted hover:text-ink ${focusRing}`
