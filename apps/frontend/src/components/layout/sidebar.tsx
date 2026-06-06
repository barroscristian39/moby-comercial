'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useNavigationStore } from '@/store/navigation.store'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Users,
  Briefcase,
  Layers,
  ShieldAlert,
  Shield,
  HardHat,
  AlertTriangle,
  Stethoscope,
  GraduationCap,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Loader2,
  UserCog,
  Layers3,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'
import sidebarNavbarLogo from '@/assets/brand/sidebar-navbar-logo.png'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  permission?: string
  roles?: string[]
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { href: '/dashboard/empresas',   label: 'Empresas',    icon: Building2, permission: 'companies.read' },
      { href: '/dashboard/unidades',   label: 'Unidades',    icon: MapPin, permission: 'units.read' },
      { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Users, permission: 'employees.read' },
      { href: '/dashboard/funcoes',    label: 'Funções',     icon: Briefcase, permission: 'employees.read' },
      { href: '/dashboard/setores',    label: 'Setores',     icon: Layers, permission: 'units.read' },
    ],
  },
  {
    label: 'GRO',
    items: [
      { href: '/dashboard/riscos',     label: 'Riscos',      icon: ShieldAlert, permission: 'risks.read' },
      { href: '/dashboard/controles',  label: 'Controles',   icon: Shield, permission: 'risks.read' },
    ],
  },
  {
    label: 'SST',
    items: [
      { href: '/dashboard/epi',        label: 'EPI',         icon: HardHat, permission: 'epi.read' },
      { href: '/dashboard/acidentes',  label: 'Acidentes',   icon: AlertTriangle, permission: 'accidents.read' },
      { href: '/dashboard/exames',     label: 'Exames',      icon: Stethoscope, permission: 'exams.read' },
      { href: '/dashboard/treinamentos', label: 'Treinamentos', icon: GraduationCap, permission: 'trainings.read' },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { href: '/dashboard/documentos', label: 'Documentos',  icon: FileText, permission: 'documents.read' },
      { href: '/dashboard/relatorios', label: 'Relatórios',  icon: BarChart3, permission: 'reports.read' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard/tenants', label: 'Ambientes', icon: Layers3, permission: 'tenants.read' },
      { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCog, permission: 'users.read' },
      { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, permission: 'settings.read' },
    ],
  },
]

export function Sidebar() {
  const pathname      = usePathname()
  const router        = useRouter()
  const { user, accessContext, logout } = useAuthStore()
  const { setLoading }   = useNavigationStore()
  const activeCompany    = useCompanyStore((s) => s.activeCompany)
  const permissions       = new Set(accessContext?.available_permissions ?? [])
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setLoading(true)

    try {
      await logout()
    } finally {
      router.replace('/login')
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <aside className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-[72px] items-center justify-center border-b border-sidebar-border px-4">
        <Image
          src={sidebarNavbarLogo}
          alt="MOBY Gestão em Segurança do Trabalho"
          priority
          className="h-auto w-full max-w-[172px]"
        />
      </div>

      {/* Empresa ativa — exibida abaixo do logo quando uma empresa está selecionada */}
      {activeCompany && (
        <div className="px-5 py-2 border-b border-sidebar-border">
          <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">Empresa ativa</p>
          <p className="text-xs font-medium text-sidebar-foreground truncate">
            {activeCompany.tradeName ?? activeCompany.name}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="scrollbar-hidden flex-1 overflow-y-auto py-3 pl-2 pr-1.5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {group.label}
            </p>
            {group.items
              .filter((item) => canViewItem(item, user?.role, permissions, !!accessContext))
              .map((item) => {
              const Icon = item.icon
              // Usa match exato para /dashboard para evitar que ele fique ativo
              // em todas as sub-rotas (ex: /dashboard/empresas começa com /dashboard/)
              const active =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  // Ativa o loading bar apenas quando navega para uma página diferente
                  onClick={() => { if (!active) setLoading(true) }}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Usuário */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? 'Usuário'}</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-xs transition-colors',
            isLoggingOut
              ? 'cursor-wait bg-sidebar-muted text-sidebar-foreground'
              : 'text-sidebar-foreground/50 hover:bg-sidebar-muted hover:text-sidebar-foreground',
          )}
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          {isLoggingOut ? 'Saindo...' : 'Sair'}
        </button>
      </div>
    </aside>
  )
}

function canViewItem(
  item: NavItem,
  role: string | undefined,
  permissions: Set<string>,
  hasAccessContext: boolean,
) {
  if (item.roles && !item.roles.includes(role ?? '')) return false
  if (!item.permission) return true
  if (!hasAccessContext) return false
  return permissions.has(item.permission)
}
