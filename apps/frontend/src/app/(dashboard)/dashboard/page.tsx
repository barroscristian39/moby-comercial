'use client'

// Dashboard principal — visão geral SST da empresa selecionada.
// Estrutura: saudação + KPIs + Total de Ações + Ações por Responsável

import { useRouter } from 'next/navigation'
import {
  Building2, Users, HardHat, Stethoscope,
  AlertTriangle, ShieldAlert, FileText, ClipboardList,
  RefreshCw, ListTodo, CalendarClock,
} from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'

// ─── KPI Cards ────────────────────────────────────────────────────────────────

const KPI_CARDS = [
  { label: 'Unidades ativas',          value: 0, icon: Building2,     color: 'text-primary',     bg: 'bg-primary/10' },
  { label: 'Colaboradores',            value: 0, icon: Users,          color: 'text-primary',     bg: 'bg-primary/10' },
  { label: 'ASOs Emitidos',            value: 0, icon: Stethoscope,    color: 'text-success',     bg: 'bg-success/10' },
  { label: 'Exames Complementares',    value: 0, icon: ClipboardList,  color: 'text-success',     bg: 'bg-success/10' },
  { label: 'Acidentes c/ Afastamento', value: 0, icon: AlertTriangle,  color: 'text-destructive', bg: 'bg-destructive/10' },
  { label: 'Acidentes s/ Afastamento', value: 0, icon: AlertTriangle,  color: 'text-warning',     bg: 'bg-warning/10' },
  { label: 'EPIs Vencidos',            value: 0, icon: HardHat,        color: 'text-warning',     bg: 'bg-warning/10' },
  { label: 'Riscos Críticos',          value: 0, icon: ShieldAlert,    color: 'text-destructive', bg: 'bg-destructive/10' },
]

// ─── Ações por status ─────────────────────────────────────────────────────────

const ACOES_STATUS = [
  { label: 'À Fazer',      pct: 0, quantidade: 0, color: 'bg-primary' },
  { label: 'Em andamento', pct: 0, quantidade: 0, color: 'bg-warning' },
  { label: 'Atrasada',     pct: 0, quantidade: 0, color: 'bg-destructive' },
  { label: 'Concluída',    pct: 0, quantidade: 0, color: 'bg-success' },
]

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router        = useRouter()
  const user          = useAuthStore((s) => s.user)
  const activeCompany = useCompanyStore((s) => s.activeCompany)

  const nomeUsuario = user?.name?.split(' ')[0] ?? 'Usuário'

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={activeCompany ? `${activeCompany.tradeName ?? activeCompany.name}` : 'Visão geral'}
      />

      <div className="p-6 space-y-6">

        {/* ── Saudação ── */}
        <div className="rounded-lg bg-sidebar px-6 py-5">
          <h2 className="text-lg font-semibold text-white">Olá, {nomeUsuario}!</h2>
          <p className="text-sm text-white/70 mt-0.5">
            Aqui estão alguns dos dados mais importantes para o gerenciamento de riscos ocupacionais da empresa.
          </p>
        </div>

        {/* ── 8 KPI Cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {KPI_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.label} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-snug">{card.label}</p>
                      <p className="text-3xl font-bold text-foreground mt-2">{card.value}</p>
                    </div>
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* ── Total de Ações ── */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
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
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Status</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Porcentagem</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">Quantidade</th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-44">Acessar</th>
                </tr>
              </thead>
              <tbody>
                {ACOES_STATUS.map((row) => (
                  <tr key={row.label} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-sm text-foreground font-medium whitespace-nowrap">
                      {row.label}
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${row.color}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground text-right font-mono">
                      {row.quantidade}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => router.push('/dashboard/controles')}
                        >
                          <ListTodo className="h-3 w-3" />
                          Ações
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
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

        {/* ── Ações por Responsável ── */}
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Ações por Responsável
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar">
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
          <CardContent className="p-5">
            {/* Estado vazio — sem dados ainda */}
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-20" />
              <p className="text-sm">Nenhuma ação registrada no período.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  )
}
