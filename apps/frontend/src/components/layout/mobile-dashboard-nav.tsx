'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Grid2x2,
  HardHat,
  Home,
  Layers,
  LogOut,
  MapPin,
  MoreHorizontal,
  Plus,
  Settings,
  ShieldAlert,
  Stethoscope,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'

type QuickAction = {
  label: string
  icon: LucideIcon
  href?: string
  permission?: string
  panel?: 'menu'
}

type MenuAction = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'ASO', icon: Stethoscope, href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Exames', icon: Stethoscope, href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Treinamentos', icon: GraduationCap, href: '/dashboard/treinamentos', permission: 'trainings.read' },
  { label: 'Acidentes', icon: AlertTriangle, href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'Documentos', icon: FileText, href: '/dashboard/documentos', permission: 'documents.read' },
  { label: 'Relatórios', icon: BarChart3, href: '/dashboard/relatorios', permission: 'reports.read' },
  { label: 'EPI', icon: HardHat, href: '/dashboard/epi', permission: 'epi.read' },
  { label: 'Mais ações', icon: MoreHorizontal, panel: 'menu' },
]

const MENU_ACTIONS: MenuAction[] = [
  { label: 'Empresas', href: '/dashboard/empresas', icon: Building2, permission: 'companies.read' },
  { label: 'Unidades', href: '/dashboard/unidades', icon: MapPin, permission: 'units.read' },
  { label: 'Colaboradores', href: '/dashboard/colaboradores', icon: Users, permission: 'employees.read' },
  { label: 'Funções', href: '/dashboard/funcoes', icon: Briefcase, permission: 'employees.read' },
  { label: 'Setores', href: '/dashboard/setores', icon: Layers, permission: 'units.read' },
  { label: 'Riscos', href: '/dashboard/riscos', icon: ShieldAlert, permission: 'risks.read' },
  { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, permission: 'settings.read' },
  { label: 'Usuários', href: '/dashboard/usuarios', icon: UserCog, permission: 'users.read' },
]

export function MobileDashboardNav() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const accessContext = useAuthStore((s) => s.accessContext)
  const logout = useAuthStore((s) => s.logout)
  const [panel, setPanel] = useState<null | 'menu' | 'quick'>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  if (pathname === '/dashboard') return null

  const permissions = new Set(accessContext?.available_permissions ?? [])

  function canAccess(permission?: string) {
    if (!permission) return true
    if (!accessContext) return true
    return permissions.has(permission)
  }

  function navigate(href: string) {
    setPanel(null)
    router.push(href)
  }

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    try {
      await logout()
    } finally {
      router.replace('/login')
    }
  }

  const visibleQuickActions = QUICK_ACTIONS.filter((action) => canAccess(action.permission))
  const visibleMenuActions = MENU_ACTIONS.filter((action) => canAccess(action.permission))

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eef2f8] bg-white/97 px-5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden">
        <div className="flex w-full items-end justify-between">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <div className="flex h-10 w-10 items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <span className="text-[0.78rem] font-medium">Home</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard/controles')}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <div className="flex h-10 w-10 items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
            <span className="text-[0.78rem] font-medium">Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setPanel('quick')}
            className="-mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0f48d2] to-[#154ef0] text-white shadow-[0_20px_36px_rgba(13,72,210,0.32)]"
            aria-label="Abrir ações rápidas"
          >
            <Plus className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <div className="relative flex h-10 w-10 items-center justify-center">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
            <span className="text-[0.78rem] font-medium">Notificações</span>
          </button>

          <button
            type="button"
            onClick={() => setPanel('menu')}
            className="flex flex-col items-center gap-1 text-slate-400"
          >
            <div className="flex h-10 w-10 items-center justify-center">
              <Grid2x2 className="h-5 w-5" />
            </div>
            <span className="text-[0.78rem] font-medium">Mais</span>
          </button>
        </div>
      </div>

      {panel && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 bg-[#06163c]/45 backdrop-blur-[2px]"
            onClick={() => setPanel(null)}
          />

          {panel === 'menu' ? (
            <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[1.35rem] font-semibold tracking-[-0.06em] text-[#11224c]">
                    Navegação
                  </p>
                  <p className="text-sm text-slate-500">
                    Acesse os módulos do seu ambiente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                  aria-label="Fechar menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {visibleMenuActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.href}
                      type="button"
                      onClick={() => navigate(action.href)}
                      className="flex w-full items-center gap-3 rounded-[20px] border border-slate-200/80 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="flex-1 text-[0.96rem] font-medium text-[#11224c]">
                        {action.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <LogOut className="h-4 w-4" />
                {isLoggingOut ? 'Saindo...' : `Sair${user ? ` (${user.name.split(' ')[0]})` : ''}`}
              </button>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 rounded-t-[30px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-24px_64px_rgba(15,23,42,0.2)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[1.35rem] font-semibold tracking-[-0.06em] text-[#11224c]">
                    Ações rápidas
                  </p>
                  <p className="text-sm text-slate-500">
                    Escolha o módulo que você quer abrir agora.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                  aria-label="Fechar ações rápidas"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {visibleQuickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => {
                        if (action.panel) {
                          setPanel(action.panel)
                          return
                        }
                        if (action.href) navigate(action.href)
                      }}
                      className="flex min-h-[7.3rem] flex-col items-center justify-start rounded-[20px] border border-slate-200/90 bg-white px-3 py-3 text-center shadow-[0_12px_24px_rgba(15,23,42,0.05)]"
                    >
                      <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-[16px] bg-primary/10">
                        <Icon className="h-[1.12rem] w-[1.12rem] text-primary" />
                      </div>
                      <p className="text-[0.76rem] leading-[0.98rem] text-slate-700">
                        {action.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
