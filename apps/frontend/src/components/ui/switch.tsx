import * as React from 'react'

import { cn } from '@/lib/utils'

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          onCheckedChange?.(!checked)
        }}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked && 'bg-primary',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4.5 w-4.5 translate-x-1 rounded-full bg-white shadow-sm transition-transform',
            checked && 'translate-x-6',
          )}
        />
      </button>
    )
  },
)

Switch.displayName = 'Switch'
