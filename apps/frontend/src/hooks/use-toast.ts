import { useToast as useToastContext } from '@/components/ui/toaster'

export function useToast() {
  const { addToast } = useToastContext()

  return {
    success: (message: string, title = '✓ Sucesso') => {
      addToast({ title, description: message, variant: 'success' })
    },
    error: (message: string, title = '✗ Erro') => {
      addToast({ title, description: message, variant: 'destructive' })
    },
    warning: (message: string, title = '⚠ Aviso') => {
      addToast({ title, description: message, variant: 'warning' })
    },
    info: (message: string, title = 'ℹ Informação') => {
      addToast({ title, description: message, variant: 'default' })
    },
  }
}
