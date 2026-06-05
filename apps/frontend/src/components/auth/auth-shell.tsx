import type { ReactNode } from 'react'
import Image, { type StaticImageData } from 'next/image'
import { cn } from '@/lib/utils'

type AuthShellProps = {
  eyebrow: ReactNode
  title: ReactNode
  description?: ReactNode
  illustration: StaticImageData
  illustrationAlt: string
  children: ReactNode
  illustrationWrapperClassName?: string
  contentClassName?: string
}

export function AuthShell({
  eyebrow,
  title,
  description,
  illustration,
  illustrationAlt,
  children,
  illustrationWrapperClassName,
  contentClassName,
}: AuthShellProps) {
  return (
    <main
      className="relative min-h-[100svh] overflow-hidden bg-[#f8fbff]"
      style={{
        background:
          'radial-gradient(circle at 14% 18%, rgba(191,219,254,0.72) 0%, rgba(191,219,254,0) 24%), radial-gradient(circle at 84% 20%, rgba(186,230,253,0.58) 0%, rgba(186,230,253,0) 22%), radial-gradient(circle at 82% 78%, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0) 26%), linear-gradient(135deg, #ffffff 0%, #f7fbff 44%, #edf4fd 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.008)_1px,transparent_1px)] bg-[size:96px_96px] opacity-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.92),transparent_0_38%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[90vw] max-w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(231,239,255,0.84)_34%,rgba(191,219,254,0.18)_58%,rgba(255,255,255,0)_82%)] blur-[78px] [animation:login-card-breathe_18s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40vh] w-[70vw] max-w-[760px] -translate-x-[56%] -translate-y-[48%] rounded-full bg-[linear-gradient(90deg,rgba(191,219,254,0.12),rgba(147,197,253,0.34),rgba(255,255,255,0))] blur-[88px] [animation:login-orb-float_26s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34vh] w-[62vw] max-w-[640px] -translate-x-[24%] -translate-y-[18%] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(186,230,253,0.3),rgba(96,165,250,0.16))] blur-[84px] [animation:login-orb-float_30s_ease-in-out_infinite_reverse]" />

      <div className="relative z-10 flex min-h-[100svh] w-full items-center justify-center overflow-y-auto px-3 py-3 sm:px-4 sm:py-5 lg:px-8">
        <section className="w-full max-w-[860px] overflow-hidden rounded-[20px] border border-[#d8e3f0] bg-white shadow-[0_30px_95px_rgba(37,99,235,0.10)] lg:max-w-[900px] xl:max-w-[940px]">
          <div className="grid w-full md:grid-cols-[minmax(0,1fr)_minmax(340px,372px)] lg:grid-cols-[minmax(0,1fr)_minmax(356px,386px)]">
            <div className="relative min-h-[250px] overflow-hidden bg-[linear-gradient(160deg,#0f172a_0%,#162544_42%,#214fbf_100%)] px-5 py-6 sm:min-h-[300px] sm:px-6 sm:py-6 md:min-h-[470px] md:px-7 md:py-8 lg:min-h-[520px] lg:px-8 lg:py-10 xl:min-h-[548px] xl:px-10 xl:py-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(147,197,253,0.22),transparent_24%),radial-gradient(circle_at_78%_76%,rgba(255,255,255,0.12),transparent_20%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_55%)]" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />

              <div className="relative z-10 flex h-full flex-col items-center justify-center">
                <div className={cn('mx-auto w-full max-w-[210px] sm:max-w-[250px] md:max-w-[290px] lg:max-w-[340px] xl:max-w-[390px]', illustrationWrapperClassName)}>
                  <Image
                    src={illustration}
                    alt={illustrationAlt}
                    priority
                    className="h-auto w-full object-contain drop-shadow-[0_32px_56px_rgba(8,15,35,0.32)]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center bg-white px-4 py-6 sm:px-5 sm:py-6 md:px-7 md:py-9 lg:px-8 lg:py-10 xl:px-10 xl:py-10">
              <div className={cn('w-full max-w-[332px] lg:max-w-[348px]', contentClassName)}>
                <div className={cn('text-center lg:text-left', eyebrow || description ? 'space-y-1.5' : 'space-y-0')}>
                  {eyebrow ? (
                    <p className="text-sm font-medium text-[#64748b]">
                      {eyebrow}
                    </p>
                  ) : null}
                  <h1 className="text-[2rem] font-medium leading-[0.98] tracking-[-0.05em] text-[#0f172a] sm:text-[2.3rem]">
                    {title}
                  </h1>
                  {description ? (
                    <p className="text-sm leading-6 text-[#64748b]">
                      {description}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
