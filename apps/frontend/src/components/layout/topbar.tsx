'use client'

import { Search, Building2, ArrowLeftRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NotificationsModal } from '@/components/notifications/notifications-modal'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const router        = useRouter()
  const user          = useAuthStore((s) => s.user)
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const isAdminSystem = user?.role === 'SUPER_ADMIN'

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border/70 bg-background px-6">
      <div className="flex-1">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">

        {/* Empresa ativa — visível quando uma empresa está selecionada */}
        {activeCompany && (
          <div className="hidden md:flex items-center gap-2 border-r border-border pr-3">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground max-w-[160px] truncate">
              {activeCompany.tradeName ?? activeCompany.name}
            </span>
            {isAdminSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => router.push('/selecionar-empresa')}
                title="Trocar empresa"
              >
                <ArrowLeftRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8 h-8 w-52 text-xs"
            />
          </div>

          <NotificationsModal />
        </div>
      </div>
    </header>
  )
}
