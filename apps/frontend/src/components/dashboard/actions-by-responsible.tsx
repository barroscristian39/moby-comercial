'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ResponsibleAction {
  name: string // Nome do responsável
  totalActions: number // Total de ações atribuídas
  completed: number // Ações concluídas
  pending: number // Ações pendentes
  overdue: number // Ações atrasadas
}

interface ActionsByResponsibleProps {
  data: ResponsibleAction[]
  onRefresh?: () => void
  loading?: boolean
}

// ─── Preparar dados para o Scatter Chart ───────────────────────────────────

// Transforma dados do responsável em formato que o ScatterChart aceita
// X = Total de ações
// Y = Ações concluídas (percentual)
function transformDataForChart(data: ResponsibleAction[]) {
  return data.map((item) => {
    const completedPercentage =
      item.totalActions > 0 ? (item.completed / item.totalActions) * 100 : 0

    return {
      x: item.totalActions,
      y: completedPercentage,
      name: item.name,
      completed: item.completed,
      pending: item.pending,
      overdue: item.overdue,
      total: item.totalActions,
    }
  })
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm">{data.name}</p>
        <p className="text-xs text-muted-foreground">
          Total de ações: <span className="font-medium text-foreground">{data.total}</span>
        </p>
        <p className="text-xs text-green-600">
          Concluídas: <span className="font-medium">{data.completed}</span>
        </p>
        <p className="text-xs text-orange-600">
          Pendentes: <span className="font-medium">{data.pending}</span>
        </p>
        <p className="text-xs text-red-600">
          Atrasadas: <span className="font-medium">{data.overdue}</span>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          % Concluído: <span className="font-medium">{data.y.toFixed(1)}%</span>
        </p>
      </div>
    )
  }
  return null
}

// ─── Componente Principal ──────────────────────────────────────────────────

export function ActionsByResponsible({
  data,
  onRefresh,
  loading = false,
}: ActionsByResponsibleProps) {
  const chartData = transformDataForChart(data)

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Ações por Responsável</CardTitle>
        </CardHeader>
        <CardContent className="h-80 animate-pulse bg-muted rounded" />
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Ações por Responsável</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Gráfico de dispersão: Total de ações vs Taxa de conclusão
          </p>
        </div>
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
      <CardContent>
        {data.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum dado disponível
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--muted)" />
              <XAxis
                type="number"
                dataKey="x"
                name="Total de Ações"
                label={{ value: 'Total de Ações', position: 'insideBottomRight', offset: -10 }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="% Concluído"
                label={{ value: '% Concluído', angle: -90, position: 'insideLeft' }}
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Legend />
              <Scatter
                name="Responsáveis"
                data={chartData}
                fill="#3b82f6"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
