import type { ReactNode } from 'react'

import BrandLogo from '../common/BrandLogo'

const FLOW_STEPS = ['작업', 'PR', '빌드', '배포', '상태']

// 설계서 4.2, 9.1: 왼쪽 서비스 소개와 작업→PR→빌드→배포→상태 흐름, 오른쪽 폼
function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-page text-ink">
      <section className="flex flex-[1_1_560px] flex-col justify-between border-r border-line bg-chrome px-16 py-14">
        <BrandLogo className="px-2" />

        <div>
          <h1 className="mb-3.5 max-w-[520px] text-[36px] leading-[1.3] font-bold tracking-[-0.03em] break-keep">
            작업이 배포되고, 서비스가 건강한지 한 곳에서 확인하세요.
          </h1>
          <p className="max-w-[420px] text-[16px] break-keep text-muted">
            작업 보드, GitHub 활동, 배포 상태, 서버 모니터링을 팀 프로젝트
            단위로 모아 봅니다.
          </p>

          <ol className="mt-10 flex max-w-[520px] items-start">
            {FLOW_STEPS.map((step, index) => {
              const isLast = index === FLOW_STEPS.length - 1

              return (
                <li key={step} className="contents">
                  <div className="flex flex-col items-center gap-2 text-[12.5px] text-muted">
                    <b
                      className={`flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 text-[12px] ${
                        isLast
                          ? 'border-info bg-info-bg text-info'
                          : 'border-ok bg-ok-bg text-ok'
                      }`}
                    >
                      {index + 1}
                    </b>
                    {step}
                  </div>
                  {!isLast && (
                    <i aria-hidden="true" className="mt-3.5 h-0.5 flex-1 bg-line" />
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <span className="text-[12.5px] text-muted">
          멋쟁이사자처럼 DevOps 7기 2팀
        </span>
      </section>

      <section className="flex flex-[1_1_480px] items-center justify-center px-6 py-10">
        {children}
      </section>
    </div>
  )
}

export default AuthLayout
