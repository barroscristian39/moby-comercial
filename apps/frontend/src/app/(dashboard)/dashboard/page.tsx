'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  Grid2x2,
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
  Plus,
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
import loginLogo from '@/assets/brand/login-logo.png'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

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

type PendingItem = {
  badgeClass: string
  badgeLabel: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  iconClass: string
  iconBg: string
  permission?: string
}

type MenuAction = {
  label: string
  href: string
  icon: LucideIcon
  permission?: string
}

const KPI_CARDS: MetricCard[] = [
  { label: 'Unidades ativas', value: 0, icon: Building2, iconClass: 'text-primary', iconBg: 'bg-primary/10', href: '/dashboard/unidades', permission: 'units.read' },
  { label: 'Colaboradores', value: 0, icon: Users, iconClass: 'text-primary', iconBg: 'bg-primary/10', href: '/dashboard/colaboradores', permission: 'employees.read' },
  { label: 'ASOs Emitidos', value: 0, icon: Stethoscope, iconClass: 'text-success', iconBg: 'bg-success/10', href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Exames Complementares', value: 0, icon: ClipboardList, iconClass: 'text-success', iconBg: 'bg-success/10', href: '/dashboard/exames', permission: 'exams.read' },
  { label: 'Acidentes com afastamento', value: 0, icon: AlertTriangle, iconClass: 'text-destructive', iconBg: 'bg-destructive/10', href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'Acidentes sem afastamento', value: 0, icon: AlertTriangle, iconClass: 'text-warning', iconBg: 'bg-warning/10', href: '/dashboard/acidentes', permission: 'accidents.read' },
  { label: 'EPIs vencidos', value: 0, icon: HardHat, iconClass: 'text-warning', iconBg: 'bg-warning/10', href: '/dashboard/epi', permission: 'epi.read' },
  { label: 'Riscos críticos', value: 0, icon: ShieldAlert, iconClass: 'text-destructive', iconBg: 'bg-destructive/10', href: '/dashboard/riscos', permission: 'risks.read' },
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

const PENDING_ITEMS: PendingItem[] = [
  {
    title: 'ASO periódico',
    description: 'Vence em 7 dias',
    icon: AlertTriangle,
    href: '/dashboard/exames',
    iconClass: 'text-rose-500',
    iconBg: 'bg-rose-50',
    badgeClass: 'bg-rose-50 text-rose-600',
    badgeLabel: '5',
    permission: 'exams.read',
  },
  {
    title: 'Treinamento NR-35',
    description: 'Vence em 15 dias',
    icon: AlertTriangle,
    href: '/dashboard/treinamentos',
    iconClass: 'text-amber-500',
    iconBg: 'bg-amber-50',
    badgeClass: 'bg-amber-50 text-amber-600',
    badgeLabel: '3',
    permission: 'trainings.read',
  },
  {
    title: 'Exame toxicológico',
    description: 'Vence em 20 dias',
    icon: ClipboardList,
    href: '/dashboard/exames',
    iconClass: 'text-orange-500',
    iconBg: 'bg-orange-50',
    badgeClass: 'bg-orange-50 text-orange-600',
    badgeLabel: '2',
    permission: 'exams.read',
  },
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
  { label: 'À Fazer', pct: 0, quantidade: 0, color: 'bg-primary' },
  { label: 'Em andamento', pct: 0, quantidade: 0, color: 'bg-warning' },
  { label: 'Atrasada', pct: 0, quantidade: 0, color: 'bg-destructive' },
  { label: 'Concluída', pct: 0, quantidade: 0, color: 'bg-success' },
]

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const accessContext = useAuthStore((s) => s.accessContext)
  const logout = useAuthStore((s) => s.logout)
  const activeCompany = useCompanyStore((s) => s.activeCompany)
  const [mobilePanel, setMobilePanel] = useState<null | 'menu' | 'quick'>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const permissions = new Set(accessContext?.available_permissions ?? [])
  const nomeUsuario = user?.name?.split(' ')[0] ?? 'Cristian'
  const nomeEmpresa = activeCompany?.tradeName ?? activeCompany?.name ?? 'MOBY'

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
    if (action.panel) {
      setMobilePanel(action.panel)
      return
    }

    if (action.href) {
      pushAndClose(action.href)
    }
  }

  function scrollToPendingSection() {
    setMobilePanel(null)
    document.getElementById('mobile-pending-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
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

  const visibleMetrics = KPI_CARDS.filter((card) => canAccess(card.permission))
  const visibleQuickActions = QUICK_ACTIONS.filter((action) => canAccess(action.permission))
  const visiblePendingItems = PENDING_ITEMS.filter((item) => canAccess(item.permission))
  const visibleMenuActions = MOBILE_MENU_ACTIONS.filter((action) => canAccess(action.permission))

  return (
    <>
      <div className="md:hidden">
        <div className="min-h-screen bg-[#fbfcff] text-slate-900">
          <div className="w-full px-[clamp(1rem,4vw,1.65rem)] pb-32 pt-[calc(env(safe-area-inset-top)+1.4rem)]">
            <div className="mb-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobilePanel('menu')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#11224c] transition-colors hover:bg-slate-100/80"
                aria-label="Abrir menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              <NotificationsModal
                triggerClassName="h-11 w-11 rounded-full text-[#11224c] transition-colors hover:bg-slate-100/80"
                bellClassName="h-6 w-6"
                badgeClassName="border-0 bg-red-500 text-white shadow-none"
                fallbackBadgeText="3"
              />
            </div>

            <div className="mb-7">
              <h1 className="text-[2.35rem] font-semibold tracking-[-0.09em] text-[#11224c]">
                Olá, {nomeUsuario}!
              </h1>
              <p className="mt-1 text-[1.08rem] text-slate-500">
                Bem-vindo ao Moby 👋
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/dashboard/riscos')}
              className="relative mb-8 flex min-h-[132px] w-full items-center gap-4 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#0f48d2] via-[#0d55e6] to-[#0b3cbc] px-5 py-4 text-left shadow-[0_24px_48px_rgba(13,72,210,0.28)]"
            >
              <div className="absolute -right-9 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute right-2 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-white/5" />

              <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center">
                <Image
                  src={loginLogo}
                  alt="MOBY"
                  priority
                  className="h-auto w-16 drop-shadow-[0_8px_18px_rgba(5,23,67,0.28)]"
                />
              </div>

              <div className="relative z-10 min-w-0 flex-1 pr-1">
                <p className="text-[1.08rem] font-semibold tracking-[-0.05em] text-white">
                  Sua empresa está segura!
                </p>
                <p className="mt-1 text-[0.9rem] leading-5 text-white/82">
                  Continue acompanhando os indicadores e mantenha tudo em dia.
                </p>
              </div>

              <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/12 bg-[#0b49d8]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <ChevronRight className="h-5 w-5 text-white/95" />
              </div>
            </button>

            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.08em] text-[#11224c]">
                  Indicadores
                </h2>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/relatorios')}
                  className="text-[0.96rem] font-medium text-primary"
                >
                  Ver todos
                </button>
              </div>

              <div className="grid grid-cols-4 gap-[clamp(0.72rem,2.2vw,0.95rem)]">
                {visibleMetrics.map((card) => {
                  const Icon = card.icon

                  return (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => router.push(card.href)}
                      className="flex aspect-[0.73] w-full flex-col items-start overflow-hidden rounded-[15px] border border-slate-200/90 bg-white px-[clamp(0.56rem,1.65vw,0.84rem)] py-[clamp(0.76rem,1.9vw,0.98rem)] text-left shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5"
                    >
                      <div className={`mb-[clamp(0.54rem,1.45vw,0.72rem)] inline-flex h-[clamp(1.88rem,5vw,2.15rem)] w-[clamp(1.88rem,5vw,2.15rem)] items-center justify-center rounded-[12px] ${card.iconBg}`}>
                        <Icon className={`h-[clamp(0.88rem,2.35vw,1.08rem)] w-[clamp(0.88rem,2.35vw,1.08rem)] ${card.iconClass}`} />
                      </div>
                      <div className="flex min-h-0 w-full flex-1 flex-col items-start">
                        <p className="min-h-[3rem] w-full overflow-hidden text-left text-[clamp(0.58rem,1.5vw,0.72rem)] leading-[1.16] text-slate-600 break-words [text-wrap:balance]">
                          {card.label}
                        </p>
                        <p className="mt-auto w-full pt-[clamp(0.3rem,0.9vw,0.48rem)] text-left text-[clamp(1.14rem,3.45vw,1.68rem)] font-semibold leading-none tracking-[-0.07em] text-[#11224c]">
                          {card.value}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[1.35rem] font-semibold tracking-[-0.08em] text-[#11224c]">
                  Ações rápidas
                </h2>
                <button
                  type="button"
                  onClick={() => setMobilePanel('quick')}
                  className="text-[0.96rem] font-medium text-primary"
                >
                  Ver todas
                </button>
              </div>

              <div className="grid grid-cols-4 gap-[clamp(0.72rem,2.2vw,0.95rem)]">
                {visibleQuickActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => handleQuickAction(action)}
                      className="flex aspect-[0.9] w-full flex-col items-center justify-start overflow-hidden rounded-[15px] border border-slate-200/90 bg-white px-[clamp(0.46rem,1.4vw,0.7rem)] py-[clamp(0.76rem,1.9vw,0.94rem)] text-center shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5"
                    >
                      <div className="mb-[clamp(0.54rem,1.45vw,0.72rem)] flex justify-center">
                        <div className="flex h-[clamp(1.88rem,5vw,2.15rem)] w-[clamp(1.88rem,5vw,2.15rem)] items-center justify-center rounded-[12px] bg-primary/10">
                          <Icon className="h-[clamp(0.88rem,2.35vw,1.08rem)] w-[clamp(0.88rem,2.35vw,1.08rem)] text-primary" />
                        </div>
                      </div>
                      <div className="flex min-h-0 w-full flex-1 items-start justify-center">
                        <p className="min-h-[1.9rem] max-w-[4.5rem] overflow-hidden text-center text-[clamp(0.58rem,1.5vw,0.76rem)] leading-[1.14] text-slate-700 [text-wrap:balance]">
                          {action.label}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section id="mobile-pending-section" className="mb-8 scroll-mt-24">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[1.45rem] font-semibold tracking-[-0.08em] text-[#11224c]">
                  Pendências importantes
                </h2>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/controles')}
                  className="text-[1.05rem] font-medium text-primary"
                >
                  Ver todas
                </button>
              </div>

              <div className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_16px_32px_rgba(15,23,42,0.05)]">
                {visiblePendingItems.map((item, index) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => router.push(item.href)}
                      className={`flex w-full items-center gap-3 px-4 py-[1.05rem] text-left ${index !== visiblePendingItems.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${item.iconBg}`}>
                        <Icon className={`h-5 w-5 ${item.iconClass}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[1.02rem] font-medium text-[#11224c]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {item.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-[0.82rem] font-semibold ${item.badgeClass}`}>
                          {item.badgeLabel}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="pb-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[1.45rem] font-semibold tracking-[-0.08em] text-[#11224c]">
                  Atividades recentes
                </h2>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/documentos')}
                  className="text-[1.05rem] font-medium text-primary"
                >
                  Ver todas
                </button>
              </div>

              <div className="rounded-[30px] border border-dashed border-slate-200 bg-white/85 px-5 py-8 text-center shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <p className="text-[1rem] font-medium text-[#11224c]">
                  Nenhuma atividade recente por aqui.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Assim que houver movimentações no ambiente, elas aparecerão nesta área.
                </p>
              </div>
            </section>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eef2f8] bg-white/97 px-5 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl">
            <div className="flex w-full items-end justify-between">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex flex-col items-center gap-1 text-primary"
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
                onClick={() => setMobilePanel('quick')}
                className="-mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0f48d2] to-[#154ef0] text-white shadow-[0_20px_36px_rgba(13,72,210,0.32)]"
                aria-label="Abrir ações rápidas"
              >
                <Plus className="h-7 w-7" />
              </button>

              <button
                type="button"
                onClick={scrollToPendingSection}
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
                onClick={() => setMobilePanel('menu')}
                className="flex flex-col items-center gap-1 text-slate-400"
              >
                <div className="flex h-10 w-10 items-center justify-center">
                  <Grid2x2 className="h-5 w-5" />
                </div>
                <span className="text-[0.78rem] font-medium">Mais</span>
              </button>
            </div>
          </div>

          {mobilePanel && (
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                aria-label="Fechar painel"
                className="absolute inset-0 bg-[#06163c]/45 backdrop-blur-[2px]"
                onClick={() => setMobilePanel(null)}
              />

              {mobilePanel === 'menu' ? (
                <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-white px-5 pb-6 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[1.35rem] font-semibold tracking-[-0.06em] text-[#11224c]">
                        Navegacao
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
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isLoggingOut ? 'Saindo...' : 'Sair da conta'}
                  </button>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-0 rounded-t-[34px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 shadow-[0_-24px_64px_rgba(15,23,42,0.2)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[1.35rem] font-semibold tracking-[-0.06em] text-[#11224c]">
                        Acoes rapidas
                      </p>
                      <p className="text-sm text-slate-500">
                        Escolha o módulo que você quer abrir agora.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobilePanel(null)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                      aria-label="Fechar acoes rapidas"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {visibleQuickActions
                      .filter((action) => action.label !== 'Mais ações')
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
      </div>

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
