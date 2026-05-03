'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'
import { ToasterProvider } from '@/components/ui/toaster'

// Restaura sessão e empresa ativa do sessionStorage ao montar a aplicação
function AuthHydrator() {
  const hydrateAuth    = useAuthStore((s) => s.hydrate)
  const hydrateCompany = useCompanyStore((s) => s.hydrate)
  useEffect(() => {
    hydrateAuth()
    hydrateCompany()
  }, [hydrateAuth, hydrateCompany])
  return null
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
        <AuthHydrator />
        {children}
      </ToasterProvider>
    </QueryClientProvider>
  )
}
