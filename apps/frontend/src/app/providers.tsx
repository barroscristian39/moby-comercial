'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'
import { ToasterProvider } from '@/components/ui/toaster'
import { Loader2 } from 'lucide-react'

// Reidrata empresa ativa do sessionStorage e restaura a sessão via refresh token HttpOnly.
function AuthHydrator({ children }: { children: React.ReactNode }) {
  const hydrateAuth    = useAuthStore((s) => s.hydrate)
  const hasHydrated    = useAuthStore((s) => s.hasHydrated)
  const hydrateCompany = useCompanyStore((s) => s.hydrate)
  useEffect(() => {
    void hydrateAuth()
    hydrateCompany()
  }, [hydrateAuth, hydrateCompany])

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ToasterProvider>
        <AuthHydrator>{children}</AuthHydrator>
      </ToasterProvider>
    </QueryClientProvider>
  )
}
