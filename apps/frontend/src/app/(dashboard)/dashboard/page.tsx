'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  HardHat,
  Home,
  Layers,
  LayoutDashboard,
  ListTodo,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Settings,
  ShieldAlert,
  Stethoscope,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { NotificationsModal } from '@/components/notifications/notifications-modal'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import companySelectLogoHorizontal from '@/assets/brand/company-select-logo-horizontal.png'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

// ─── Tipos ──────────────────────────────────────────────────────────────────

type MetricCard = {
  label: string
  value: number
  icon: LucideIcon
  iconClass: string
  iconBg: string
  href: string
  permission?: string
}

type QuickAction = {
  label: string
  icon: LucideIcon
  href?: string
  permission?: string
  panel?: 'menu' | 'quick'
}

type MenuAction = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
}

type BottomNavItem = {
  label: string
  icon: LucideIcon
  href: string
  isMenu?: boolean
}

// ─── Dados estáticos ────────────────────────────────────────────────────────

const KPI_CARDS: MetricCard[] = [
  { label: 'Unidades ativas', value: 0, icon: Building2, iconClass: 'text-blue-500', iconBg: 'bg-blue-50', href: '/dashboard/unidades', permission: 'units.read' },
  { label: 'Colaboradores', value: 0, icon: Users, iconClass: 'text-blue-500', iconBg: 'bg-blue-50', href: '/dashboard/colaboradores', permission: 'employees.read' },
  { label: 'ASOs Emitidos', value: 0, icon: Stethoscope, iconClass: 'text-green-500', iconBg: 'bg-green-50', href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Exames Complementares', value: 0, icon: ClipboardList, iconClass: 'text-green-500', iconBg: 'bg-green-50', href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Acidentes com afastamento', value: 0, icon: AlertTriangle, iconClass: 'text-red-500', iconBg: 'bg-red-50', href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'Acidentes sem afastamento', value: 0, icon: AlertTriangle, iconClass: 'text-orange-500', iconBg: 'bg-orange-50', href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'EPIs vencidos', value: 0, icon: HardHat, iconClass: 'text-orange-500', iconBg: 'bg-orange-50', href: '/dashboard/epi', permission: 'epi.read' },
  { label: 'Riscos críticos', value: 0, icon: ShieldAlert, iconClass: 'text-red-500', iconBg: 'bg-red-50', href: '/dashboard/riscos', permission: 'risks.read' },
]

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'ASO', icon: ClipboardCheck, href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Exames', icon: Stethoscope, href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Treinamentos', icon: GraduationCap, href: '/dashboard/treinamentos', permission: 'trainings.read' },
  { label: 'Acidentes', icon: AlertTriangle, href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'Documentos', icon: FileText, href: '/dashboard/documentos', permission: 'documents.read' },
  { label: 'Relatórios', icon: BarChart3, href: '/dashboard/relatorios', permission: 'reports.read' },
  { label: 'EPI', icon: HardHat, href: '/dashboard/epi', permission: 'epi.read' },
  { label: 'Mais ações', icon: MoreHorizontal, panel: 'menu' },
]

const MOBILE_MENU_ACTIONS: MenuAction[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Empresas', href: '/dashboard/empresas', icon: Building2, permission: 'companies.read' },
  { label: 'Unidades', href: '/dashboard/unidades', icon: MapPin, permission: 'units.read' },
  { label: 'Colaboradores', href: '/dashboard/colaboradores', icon: Users, permission: 'employees.read' },
  { label: 'Funções', href: '/dashboard/funcoes', icon: Briefcase, permission: 'employees.read' },
  { label: 'Setores', href: '/dashboard/setores', icon: Layers, permission: 'units.read' },
  { label: 'Riscos', href: '/dashboard/riscos', icon: ShieldAlert, permission: 'risks.read' },
  { label: 'Exames', href: '/dashboard/exames', icon: Stethoscope, permission: 'exams.read' },
  { label: 'Acidentes', href: '/dashboard/acidentes', icon: AlertTriangle, permission: 'accidents.read' },
  { label: 'Documentos', href: '/dashboard/documentos', icon: FileText, permission: 'documents.read' },
  { label: 'Relatórios', href: '/dashboard/relatorios', icon: BarChart3, permission: 'reports.read' },
  { label: 'Configurações', href: '/dashboard/configuracoes', icon: Settings, permission: 'settings.read' },
  { label: 'Usuários', href: '/dashboard/usuarios', icon: UserCog, permission: 'users.read' },
]

const ACOES_STATUS = [
  { label: 'A Fazer', pct: 0, quantidade: 0, color: 'bg-primary' },
  { label: 'Em andamento', pct: 0, quantidade: 0, color: 'bg-warning' },
  { label: 'Atrasada', pct: 0, quantidade: 0, color: 'bg-destructive' },
  { label: 'Concluída', pct: 0, quantidade: 0, color: 'bg-success' },
]

const BOTTOM_NAV: BottomNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Empresas', href: '/dashboard/empresas', icon: Building2 },
  { label: 'Riscos', href: '/dashboard/riscos', icon: ShieldAlert },
  { label: 'Controles', href: '/dashboard/controles', icon: ClipboardList },
  { label: 'Mais', href: '/dashboard', icon: MoreHorizontal, isMenu: true },
]

// ─── Ilustração do card hero ─────────────────────────────────────────────────

function HeroIllustration() {
  return (
    <svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[96px] h-[96px] shrink-0">
      {/* Glow de fundo */}
      <ellipse cx="72" cy="62" rx="30" ry="30" fill="rgba(147,197,253,0.12)" />

      {/* Sombra do clipboard */}
      <rect x="13" y="24" width="52" height="66" rx="8" fill="#000d2e" opacity="0.25"
        transform="rotate(-8 39 57)" />

      {/* Corpo do clipboard */}
      <rect x="11" y="22" width="52" height="66" rx="8" fill="#3b82f6"
        transform="rotate(-8 37 55)" />
      <rect x="13" y="23" width="49" height="63" rx="7" fill="#60a5fa"
        transform="rotate(-8 37 55)" />

      {/* Clip no topo */}
      <rect x="26" y="15" width="26" height="15" rx="5" fill="#2563eb"
        transform="rotate(-8 37 55)" />
      <rect x="29" y="17" width="20" height="10" rx="4" fill="#93c5fd"
        transform="rotate(-8 37 55)" />

      {/* Linhas de checklist — grupo rotacionado junto com o clipboard */}
      <g transform="rotate(-8 37 55)">
        {/* Linha 1 — check */}
        <polyline points="18,40 22,45 31,35" stroke="white" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="35" y="38" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.65)" />

        {/* Linha 2 — check */}
        <polyline points="18,54 22,59 31,49" stroke="white" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="35" y="52" width="16" height="3" rx="1.5" fill="rgba(255,255,255,0.65)" />

        {/* Linha 3 — parcial (sem check) */}
        <rect x="18" y="66" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.35)" />
      </g>

      {/* Escudo — navy */}
      <path d="M63 50 L87 55 L87 76 Q87 92 75 97 Q63 92 63 76 Z"
        fill="#0b1d4a" />
      {/* Borda sutil do escudo */}
      <path d="M64 52 L86 57 L86 76 Q86 91 75 96"
        stroke="#3b82f6" strokeWidth="0.6" fill="none" opacity="0.4" />

      {/* Badge do escudo */}
      <circle cx="75" cy="74" r="12" fill="#1d4ed8" />
      <circle cx="75" cy="74" r="10" fill="#2563eb" />

      {/* Checkmark do escudo */}
      <polyline points="70,74 74,79 82,68" stroke="white" strokeWidth="2.8"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function DashboardPage() {
  const router        = useRouter()
  const user          = useAuthStore((s) => s.user)
  const accessContext = useAuthStore((s) => s.accessContext)
  const logout        = useAuthStore((s) => s.logout)
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const [mobilePanel, setMobilePanel] = useState<null | 'menu' | 'quick'>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const permissions  = new Set(accessContext?.available_permissions ?? [])
  const nomeUsuario  = user?.name?.split(' ')[0] ?? 'Cristian'
  const nomeEmpresa  = (activeCompany?.tradeName ?? activeCompany?.name ?? 'MOBY').toUpperCase()

  function canAccess(permission?: string) {
    if (!permission) return true
    if (!accessContext) return true
    return permissions.has(permission)
  }

  function pushAndClose(href: string) {
    setMobilePanel(null)
    router.push(href)
  }

  function handleQuickAction(action: QuickAction) {
    if (action.panel) { setMobilePanel(action.panel); return }
    if (action.href) pushAndClose(action.href)
  }

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try { await logout() } finally { router.replace('/login') }
  }

  const visibleMetrics     = KPI_CARDS.filter((c) => canAccess(c.permission))
  const visibleQuickActions = QUICK_ACTIONS.filter((a) => canAccess(a.permission))
  const visibleMenuActions  = MOBILE_MENU_ACTIONS.filter((a) => canAccess(a.permission))

  return (
    <>
      {/* ══════════════════════════════════════════════════
          LAYOUT MOBILE — visível apenas em telas < md
      ══════════════════════════════════════════════════ */}
      <div className="md:hidden min-h-screen bg-[#EDF0F7] flex flex-col">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 py-3 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_16px_rgba(15,23,42,0.08)] z-10">
          <button
            type="button"
            onClick={() => setMobilePanel('menu')}
            className="h-10 w-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-50"
            aria-label="Abrir menu"
          >
            <Menu className="h-[22px] w-[22px]" />
          </button>

          <Image
            src={companySelectLogoHorizontal}
            alt="MOBY Gestão em Segurança do Trabalho"
            priority
            className="h-[52px] w-auto"
          />

          <NotificationsModal
            triggerClassName="relative h-10 w-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-50"
            bellClassName="h-[24px] w-[24px]"
            badgeClassName="absolute -top-1 -right-1 h-[20px] min-w-[20px] rounded-full border-2 border-white bg-red-500 text-white text-[10px] font-bold shadow-none leading-none flex items-center justify-center"
            fallbackBadgeText="3"
          />
        </header>

        {/* ── Seletor de empresa ──────────────────────────── */}
        <div className="flex justify-end items-center px-5 py-2 bg-white border-t border-slate-100/80 shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
          <button
            type="button"
            onClick={() => router.push('/selecionar-empresa')}
            className="flex items-center gap-1.5 hover:opacity-75 transition-opacity"
          >
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="text-[0.82rem] font-semibold text-slate-700">{nomeEmpresa}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>

        {/* ── Conteúdo com scroll ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-32 space-y-2.5">

          {/* Card hero */}
          <div className="relative rounded-2xl overflow-hidden bg-[#0d1f4e] px-5 py-4 shadow-[0_4px_20px_rgba(13,31,78,0.3)]">
            {/* Decorações de fundo */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-1/2">
              <div className="absolute right-4 top-3 h-24 w-24 rounded-full border border-blue-400/20" />
              <div className="absolute right-12 top-8 h-14 w-14 rounded-full bg-blue-500/10" />
            </div>

            <div className="relative z-10 flex items-center gap-3">
              <div className="flex-1">
                <h1 className="text-[0.95rem] font-bold text-white leading-snug">
                  Olá, {nomeUsuario}!
                </h1>
                <p className="mt-1.5 text-[0.78rem] text-white/70 leading-snug">
                  Aqui estão alguns dos dados mais importantes para o gerenciamento de riscos ocupacionais da empresa.
                </p>
              </div>
              <HeroIllustration />
            </div>
          </div>

          {/* Grid de KPIs — 2 colunas */}
          <div className="grid grid-cols-2 gap-2.5">
            {visibleMetrics.map((card) => {
              const Icon = card.icon
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => router.push(card.href)}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(15,23,42,0.09)] p-3.5 text-left active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.iconBg} shrink-0`}>
                      <Icon className={`h-[18px] w-[18px] ${card.iconClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.68rem] text-slate-500 leading-snug">{card.label}</p>
                      <p className="text-[1.5rem] font-bold text-slate-800 leading-none mt-1">{card.value}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Seção Total de Ações */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_rgba(15,23,42,0.09)] overflow-hidden">
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <h2 className="text-[0.72rem] font-bold uppercase tracking-widest text-slate-700">
                Total de Ações
              </h2>
              <button
                type="button"
                onClick={() => router.push('/dashboard/controles')}
                className="text-xs font-semibold text-primary flex items-center gap-0.5"
              >
                Ver todas <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {ACOES_STATUS.slice(0, 3).map((row) => (
                <div key={row.label} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-[88px] text-sm font-semibold text-slate-700 shrink-0">
                    {row.label}
                  </span>
                  <div className="flex-1 h-[6px] bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-200 rounded-full"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-4 text-sm text-slate-500 text-right shrink-0">
                    {row.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/controles')}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 shrink-0 hover:bg-slate-50"
                  >
                    <ListTodo className="h-3 w-3" />
                    Ações
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Navigation ───────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 px-1 pb-[calc(env(safe-area-inset-bottom)+0.4rem)] pt-2 shadow-[0_-4px_20px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-around">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon
              const isActive = !item.isMenu && item.href === '/dashboard'
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (item.isMenu) { setMobilePanel('menu'); return }
                    router.push(item.href)
                  }}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1 min-w-[52px] ${
                    isActive ? 'text-primary' : 'text-slate-400'
                  }`}
                >
                  {/* Indicador ativo */}
                  {isActive && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full" />
                  )}
                  <Icon className="h-[22px] w-[22px]" />
                  <span className={`text-[0.62rem] font-medium leading-none ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Overlay do menu lateral ─────────────────────── */}
        {mobilePanel && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              aria-label="Fechar painel"
              className="absolute inset-0 bg-[#06163c]/45 backdrop-blur-[2px]"
              onClick={() => setMobilePanel(null)}
            />

            {mobilePanel === 'menu' ? (
              // Drawer lateral esquerdo
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
                    onClick={() => setMobilePanel(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                    aria-label="Fechar menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Badge da empresa no menu */}
                <div className="mb-5 rounded-[28px] bg-gradient-to-r from-[#0f48d2] via-[#0d55e6] to-[#0b3cbc] px-4 py-4 text-white shadow-[0_20px_42px_rgba(13,72,210,0.22)]">
                  <p className="text-[1.15rem] font-semibold tracking-[-0.05em]">
                    {nomeEmpresa}
                  </p>
                  <p className="mt-1 text-sm text-white/76">
                    Logado como {user?.name ?? 'Usuário'}
                  </p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {visibleMenuActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.href}
                        type="button"
                        onClick={() => pushAndClose(action.href)}
                        className="flex w-full items-center gap-3 rounded-[22px] border border-slate-200/80 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="flex-1 text-[0.98rem] font-medium text-[#11224c]">
                          {action.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {isLoggingOut
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <LogOut className="h-4 w-4" />
                  }
                  {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
                </button>
              </div>
            ) : (
              // Bottom sheet de ações rápidas
              <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-24px_64px_rgba(15,23,42,0.2)]">
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
                    onClick={() => setMobilePanel(null)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                    aria-label="Fechar ações rápidas"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {visibleQuickActions
                    .filter((a) => a.label !== 'Mais ações')
                    .map((action) => {
                      const Icon = action.icon
                      return (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => handleQuickAction(action)}
                          className="rounded-[22px] border border-slate-200/90 bg-white px-3 py-4 text-center shadow-[0_12px_26px_rgba(15,23,42,0.05)]"
                        >
                          <div className="mb-3 flex justify-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <p className="text-[0.8rem] leading-4 text-slate-700">
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
      </div>

      {/* ══════════════════════════════════════════════════
          LAYOUT DESKTOP — visível apenas em telas >= md
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        <Topbar
          title="Dashboard"
          subtitle={activeCompany ? `${activeCompany.tradeName ?? activeCompany.name}` : 'Visão geral'}
        />

        <div className="space-y-6 p-6">
          <div className="rounded-lg bg-sidebar px-6 py-5">
            <h2 className="text-lg font-semibold text-white">Olá, {nomeUsuario}!</h2>
            <p className="mt-0.5 text-sm text-white/70">
              Aqui estão alguns dos dados mais importantes para o gerenciamento de riscos ocupacionais da empresa.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {KPI_CARDS.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-snug text-muted-foreground">{card.label}</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
                      </div>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                        <Icon className={`h-5 w-5 ${card.iconClass}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Total de Ações
              </h3>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="w-32 px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Porcentagem</th>
                    <th className="w-28 px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quantidade</th>
                    <th className="w-44 px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acessar</th>
                  </tr>
                </thead>
                <tbody>
                  {ACOES_STATUS.map((row) => (
                    <tr key={row.label} className="border-b border-border transition-colors last:border-0 hover:bg-muted/20">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-foreground">
                        {row.label}
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${row.color}`}
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm text-muted-foreground">
                        {row.quantidade}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={() => router.push('/dashboard/controles')}
                          >
                            <ListTodo className="h-3 w-3" />
                            Ações
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs"
                            onClick={() => router.push('/dashboard/controles')}
                          >
                            <CalendarClock className="h-3 w-3" />
                            Agenda
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Ações por Responsável
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <CardContent className="p-5">
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <FileText className="h-8 w-8 opacity-20" />
                <p className="text-sm">Nenhuma ação registrada no período.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
