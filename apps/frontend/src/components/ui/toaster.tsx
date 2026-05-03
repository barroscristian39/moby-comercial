'use client'

import * as React from 'react'
import * as Toast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registerToastCallback } from '@/lib/toast-registry'

export type ToastVariant = 'default' | 'success' | 'destructive' | 'warning'

interface ToastMessage {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open: boolean
}

type ToastContextType = {
  toasts: ToastMessage[]
  addToast: (message: Omit<ToastMessage, 'id' | 'open'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToasterProvider')
  }
  return context
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([])

  const addToast = React.useCallback((message: Omit<ToastMessage, 'id' | 'open'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastMessage = { ...message, id, open: true }

    setToasts((prev) => [...prev, newToast])

    // Auto remove após 4 segundos
    const timer = setTimeout(() => {
      removeToast(id)
    }, 4000)

    return () => clearTimeout(timer)
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Registra o callback global para o toast
  React.useEffect(() => {
    registerToastCallback(addToast)
  }, [addToast])

  return (
    <Toast.Provider swipeDirection="right">
      <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
        {children}
        <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </div>
        <Toast.Viewport />
      </ToastContext.Provider>
    </Toast.Provider>
  )
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastMessage
  onRemove: (id: string) => void
}) {
  return (
    <Toast.Root
      open={toast.open}
      onOpenChange={(open) => !open && onRemove(toast.id)}
      className={cn(
        'group pointer-events-auto relative w-full rounded-lg border shadow-lg transition-all',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
        toast.variant === 'destructive'
          ? 'border-destructive bg-destructive text-destructive-foreground'
          : toast.variant === 'success'
            ? 'border-green-200 bg-green-50 text-green-900'
            : toast.variant === 'warning'
              ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
              : 'border-border bg-background text-foreground',
      )}
    >
      <div className="flex w-full items-start gap-3 p-3 sm:p-4">
        <div className="flex-1">
          {toast.title && (
            <Toast.Title className="text-sm font-semibold">{toast.title}</Toast.Title>
          )}
          {toast.description && (
            <Toast.Description className="mt-1 text-sm opacity-90">
              {toast.description}
            </Toast.Description>
          )}
        </div>
        <Toast.Close
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-50 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none"
          onClick={() => onRemove(toast.id)}
        >
          <X className="h-4 w-4" />
        </Toast.Close>
      </div>
    </Toast.Root>
  )
}
