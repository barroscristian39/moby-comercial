'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  GraduationCap,
  HardHat,
  Home,
  Layers,
  LogOut,
  MapPin,
  MoreHorizontal,
  Settings,
  ShieldAlert,
  Stethoscope,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

type MenuAction = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
  activePaths?: string[]
}

type BottomNavItem = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
  activePaths?: string[]
  isMenu?: boolean
}

const BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Empresas', href: '/dashboard/empresas', icon: Building2, permission: 'companies.read' },
  { label: 'Riscos', href: '/dashboard/riscos', icon: ShieldAlert, permission: 'risks.read', activePaths: ['/dashboard/gro'] },
  { label: 'Controles', href: '/dashboard/controles', icon: ClipboardList, permission: 'risks.read' },
  { label: 'Mais', href: '/dashboard', icon: MoreHorizontal, isMenu: true },
]

const MENU_ACTIONS: MenuAction[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Empresas', href: '/dashboard/empresas', icon: Building2, permission: 'companies.read' },
  { label: 'Unidades', href: '/dashboard/unidades', icon: MapPin, permission: 'units.read' },
  { label: 'Colaboradores', href: '/dashboard/colaboradores', icon: Users, permission: 'employees.read' },
  { label: 'Funções', href: '/dashboard/funcoes', icon: Briefcase, permission: 'employees.read' },
  { label: 'Setores', href: '/dashboard/setores', icon: Layers, permission: 'units.read' },
  { label: 'Riscos', href: '/dashboard/riscos', icon: ShieldAlert, permission: 'risks.read', activePaths: ['/dashboard/gro'] },
  { label: 'Controles', href: '/dashboard/controles', icon: ClipboardList, permission: 'risks.read' },
  { label: 'EPI', href: '/dashboard/epi', icon: HardHat, permission: 'epi.read' },
  { label: 'Acidentes', href: '/dashboard/acidentes', icon: AlertTriangle, permission: 'accidents.read' },
  { label: 'Exames', href: '/dashboard/exames', icon: Stethoscope, permission: 'exams.read' },
  { label: 'Treinamentos', href: '/dashboard/treinamentos', icon: GraduationCap, permission: 'trainings.read' },
  { label: 'Documentos', href: '/dashboard/documentos', icon: FileText, permission: 'documents.read' },
  { label: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, permission: 'reports.read' },
  { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, permission: 'settings.read' },
  { label: 'Usuários', href: '/dashboard/usuarios', icon: UserCog, permission: 'users.read' },
]

export function MobileDashboardNav() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const accessContext = useAuthStore((s) => s.accessContext)
  const logout = useAuthStore((s) => s.logout)
  const [panel, setPanel] = useState<null | 'menu'>(null)
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

  const visibleBottomNav = BOTTOM_NAV.filter((item) => canAccess(item.permission))
  const visibleMenuActions = MENU_ACTIONS.filter((action) => canAccess(action.permission))

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-100 bg-white px-1 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.07)] md:hidden">
        <div className="flex items-center justify-around">
          {visibleBottomNav.map((item) => {
            const Icon = item.icon
            const active = item.isMenu ? isMoreActive(pathname) : isNavItemActive(pathname, item)

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (item.isMenu) {
                    setPanel('menu')
                    return
                  }
                  navigate(item.href)
                }}
                className={cn(
                  'relative flex min-w-[52px] flex-col items-center gap-0.5 px-3 py-1 text-slate-400 transition-colors',
                  active && 'text-primary',
                )}
              >
                {active && (
                  <div className="absolute -top-2 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-b-full bg-primary" />
                )}
                <Icon className="h-[22px] w-[22px]" />
                <span className={cn('text-[0.62rem] font-medium leading-none', active ? 'text-primary' : 'text-slate-400')}>
                  {item.label}
                </span>
              </button>
            )
          })}
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
                const active = isNavItemActive(pathname, action)

                return (
                  <button
                    key={action.href}
                    type="button"
                    onClick={() => navigate(action.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[20px] border border-slate-200/80 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]',
                      active && 'border-primary/30 bg-primary/5',
                    )}
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
        </div>
      )}
    </>
  )
}

function isNavItemActive(pathname: string, item: { href: string; activePaths?: string[] }) {
  const pathsToMatch = [item.href, ...(item.activePaths ?? [])]

  return pathsToMatch.some((path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }

    return pathname === path || pathname.startsWith(`${path}/`)
  })
}

function isMoreActive(pathname: string) {
  return !BOTTOM_NAV.some((item) => !item.isMenu && isNavItemActive(pathname, item))
}
