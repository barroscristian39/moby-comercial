'use client'

// Guard que redireciona SUPER_ADMIN para /selecionar-empresa se não houver empresa ativa.
// Protege contra acesso direto ao dashboard sem empresa selecionada (ex: sessionStorage limpo).

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

// Rotas liberadas para SUPER_ADMIN mesmo sem empresa selecionada
// (ex: cadastrar a primeira empresa antes de selecionar)
const BYPASS_PATHS = ['/dashboard/empresas', '/dashboard/usuarios', '/dashboard/tenants']

interface Props {
  children: React.ReactNode
}

export function CompanyGuard({ children }: Props) {
  const router        = useRouter()
  const pathname      = usePathname()
  const user          = useAuthStore((s) => s.user)
  const activeCompany = useCompanyStore((s) => s.activeCompany)

  const needsCompany =
      user?.role === 'SUPER_ADMIN' &&
    !activeCompany &&
    !BYPASS_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (needsCompany) {
      router.replace('/selecionar-empresa')
    }
  }, [needsCompany, router])

  if (needsCompany) {
    return null
  }

  return <>{children}</>
}
