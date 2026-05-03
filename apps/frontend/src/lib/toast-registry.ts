// Sistema global de toast para ser usado em contextos não-React (como interceptores)
let toastCallback: ((message: {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'destructive' | 'warning'
}) => void) | null = null

export function registerToastCallback(
  callback: (message: {
    title?: string
    description?: string
    variant?: 'default' | 'success' | 'destructive' | 'warning'
  }) => void,
) {
  toastCallback = callback
}

export function triggerToast(message: {
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'destructive' | 'warning'
}) {
  if (toastCallback) {
    toastCallback(message)
  }
}
