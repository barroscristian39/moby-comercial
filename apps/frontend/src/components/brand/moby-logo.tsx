import * as React from 'react'
import { cn } from '@/lib/utils'

type MobyLogoTone = 'light' | 'dark'
type MobyLogoSize = 'sm' | 'md' | 'lg' | 'xl'
type MobyLogoVariant = 'full' | 'mark'

interface MobyLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: MobyLogoTone
  size?: MobyLogoSize
  variant?: MobyLogoVariant
  showSuffix?: boolean
}

const sizeStyles: Record<MobyLogoSize, {
  mark: string
  word: string
  suffix: string
  gap: string
}> = {
  sm: { mark: 'h-7 w-7', word: 'text-[1.05rem]', suffix: 'text-[9px]', gap: 'gap-2' },
  md: { mark: 'h-9 w-9', word: 'text-[1.35rem]', suffix: 'text-[10px]', gap: 'gap-2.5' },
  lg: { mark: 'h-11 w-11', word: 'text-[1.7rem]', suffix: 'text-[11px]', gap: 'gap-3' },
  xl: { mark: 'h-14 w-14', word: 'text-[2.15rem]', suffix: 'text-xs', gap: 'gap-3.5' },
}

function MobyMark({
  tone = 'dark',
  className,
}: {
  tone?: MobyLogoTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border',
        tone === 'light'
          ? 'border-white/20 bg-white/10 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.10)]'
          : 'border-border bg-card shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          'absolute inset-1 rounded-[5px]',
          tone === 'light' ? 'bg-sidebar/40' : 'bg-primary/10',
        )}
      />
      <svg
        viewBox="0 0 28 28"
        className="relative h-[74%] w-[74%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 3.6 6.6 6.35v6.45c0 4.95 3.2 8.9 7.4 11.05 4.2-2.15 7.4-6.1 7.4-11.05V6.35L14 3.6Z"
          className={tone === 'light' ? 'stroke-white/60' : 'stroke-primary/70'}
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path
          d="M9.35 10.35 14 14.55l4.65-4.2M14 14.55v5.3"
          className="stroke-primary"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M10.75 8.75 14 11.68l3.25-2.93"
          className={tone === 'light' ? 'stroke-emerald-300' : 'stroke-emerald-500'}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.95"
        />
      </svg>
    </span>
  )
}

export function MobyLogo({
  tone = 'dark',
  size = 'md',
  variant = 'full',
  showSuffix = true,
  className,
  ...props
}: MobyLogoProps) {
  const styles = sizeStyles[size]

  return (
    <div
      className={cn('inline-flex items-center', styles.gap, className)}
      aria-label="MOBY SST"
      {...props}
    >
      <MobyMark tone={tone} className={styles.mark} />

      {variant === 'full' && (
        <div className="flex min-w-0 flex-col justify-center leading-none">
          <span
            className={cn(
              'font-semibold tracking-[0.18em]',
              styles.word,
              tone === 'light' ? 'text-white' : 'text-slate-800',
            )}
          >
            MOBY
          </span>
          {showSuffix && (
            <span
              className={cn(
                'mt-1 font-medium uppercase tracking-[0.28em]',
                styles.suffix,
                tone === 'light' ? 'text-white/60' : 'text-slate-500',
              )}
            >
              SST
            </span>
          )}
        </div>
      )}
    </div>
  )
}
