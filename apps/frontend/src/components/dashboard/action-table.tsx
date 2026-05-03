'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, RefreshCw } from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionStatus = 'TODO' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED'

interface ActionMetrics {
  status: ActionStatus
  percentage: number
  quantity: number
  label: string
}

interface ActionTableProps {
  metrics: ActionMetrics[]
  onRefresh?: () => void
  onAccessActions?: (status: ActionStatus) => void
  loading?: boolean
}

// ─── Mapa de cores por status ─────────────────────────────────────────────────

const statusColors = {
  TODO: {
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    bar: 'bg-blue-300',
    label: 'À Fazer',
  },
  IN_PROGRESS: {
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
    bar: 'bg-orange-300',
    label: 'Em andamento',
  },
  OVERDUE: {
    badge: 'bg-red-100 text-red-700 border-red-300',
    bar: 'bg-red-300',
    label: 'Atrasada',
  },
  COMPLETED: {
    badge: 'bg-green-100 text-green-700 border-green-300',
    bar: 'bg-green-300',
    label: 'Concluída',
  },
}

// ─── Componente de Barra de Progresso ────────────────────────────────────────

function ProgressBar({ percentage, color }: { percentage: number; color: string }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}

// ─── Componente de Linha de Ação ──────────────────────────────────────────────

function ActionRow({
  metric,
  onAccess,
}: {
  metric: ActionMetrics
  onAccess?: (status: ActionStatus) => void
}) {
  const colors = statusColors[metric.status]

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      {/* Status com badge */}
      <td className="px-4 py-4">
        <Badge variant="outline" className={colors.badge}>
          {colors.label}
        </Badge>
      </td>

      {/* Barra de percentagem */}
      <td className="px-4 py-4">
        <div className="space-y-1.5">
          <ProgressBar percentage={metric.percentage} color={colors.bar} />
          <p className="text-xs text-muted-foreground">
            {metric.percentage.toFixed(1)}%
          </p>
        </div>
      </td>

      {/* Quantidade */}
      <td className="px-4 py-4 text-right">
        <p className="font-semibold text-foreground">
          {metric.quantity.toLocaleString('pt-BR')}
        </p>
      </td>

      {/* Botão de acesso */}
      <td className="px-4 py-4 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAccess?.(metric.status)}
          className="gap-1"
        >
          Acessar
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}

// ─── Componente Principal ──────────────────────────────────────────────────

export function ActionTable({
  metrics,
  onRefresh,
  onAccessActions,
  loading = false,
}: ActionTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Total de Ações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="animate-pulse space-y-4 p-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Total de Ações</CardTitle>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Cabeçalho */}
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Percentagem
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Quantidade
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ação
                </th>
              </tr>
            </thead>
            {/* Corpo */}
            <tbody>
              {metrics.map((metric) => (
                <ActionRow
                  key={metric.status}
                  metric={metric}
                  onAccess={onAccessActions}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Factory para métricas padrão (reutilizável) ───────────────────────────────

export function createDefaultActionMetrics(): ActionMetrics[] {
  return [
    { status: 'TODO', percentage: 0, quantity: 0, label: 'À Fazer' },
    { status: 'IN_PROGRESS', percentage: 0, quantity: 0, label: 'Em andamento' },
    { status: 'OVERDUE', percentage: 0, quantity: 0, label: 'Atrasada' },
    { status: 'COMPLETED', percentage: 0, quantity: 0, label: 'Concluída' },
  ]
}
